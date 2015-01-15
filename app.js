
/**
 * Module dependencies.
 */
var coffee = require('coffee-script/register');
var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var reload = require('reload');
var scraper = require('./modules/scraper');
var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);

app.get('/analysis', function (req, res) {
  var url = req.query.url;
  var keyword = req.query.keyword;

  scraper.extract(url, keyword, function(response){
    res.render('analysis', { 
      keyword: keyword,
      title: response.title, 
      content: response.body, 
      density: response.density,
      links: response.links,
      num_occurrences: response.num_occurrences, 
      num_words: response.num_words,
      points: response.points });
  });
});



var server = http.createServer(app);

reload(server, app);

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});


