var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
    S = require('string'),
    querystring = require('querystring')

var re = /https?:\/\/subscene\.com\/subtitles\/.+\/.+\/(\d+)/
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link)
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.uid = match[1]
	result.host = hostEnum.SUBSCENE

	async.waterfall([
		function checkFile(callback) {
			getFileInfo(callback)
		},
		function(callback) {
			download(function(err, direct_link) {
				if (err)
					return callback(err)

				if (!direct_link)
					return callback(new Error('Lỗi bất thường'))

				result.is_stream = false
				callback(null, result)
			})
		}
	],
		callback
	)
}

var getFileInfo = function(callback) {
	var options = {
		uri: result.url,
		method: 'GET',
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true
	}

	request(options, function (error, response, body) {
		if (error)
			return callback(error)

		if (response.statusCode !== 200)
			return callback(new Error('Phụ đề không hợp lệ hoặc đã bị xóa'))

		result.file = {
			name: S(body).between('description" content="', '"').s,
			type: 'zip'
		}
		result.image = 'https://i.jeded.com/i' + S(body).between('https://i.jeded.com/i', '"').s
		result.direct_link = 'https://subscene.com/subtitle/download?mac=' + S(body).between('/subtitle/download?mac=', '"').s
        result.html = S(body).between('Subtitle preview:</h3>', '</div>').s

		callback(null)
	})
}

var download = function(callback) {
	getFileSize(result.direct_link, function(err, size) {
        if (err)
            return callback(err)

		result.file.size = size
		callback(null, result.direct_link)
	})
}

var getFileSize = function(link, callback) {
	request.head(link, function (error, response, body) {
		if (error)
			return callback(error)

		if (!response.headers['content-length'])
			return callback(new Error('Lỗi khi lấy dung lượng file'))

		callback(null, parseInt(response.headers['content-length']))
	})
}
