
exports.extract = function(request, extractor, url, callback) {

  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var analysis = extractor(body);
      
      callback(analysis);
    }
  });
}
