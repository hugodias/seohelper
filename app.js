
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
var bodyParser = require('body-parser');
var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.static(path.join(__dirname, 'public')));

// configure body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// create our router
var router = express.Router();

// Create the router to our api
router.route('/:website/:keyword')
.get(function(req,res){
  var url = "http://" + req.params.website;
  var keyword = req.params.keyword;
  console.log(keyword)
  scraper.extract(url, keyword, function(response){
    res.json({
      keyword: keyword,
      title: response.title,
      content: response.content,
      density: response.density,
      links: response.links,
      keyword_in_url: response.keyword_in_url,
      has_tags_related: response.has_tags_related,
      canonicalLink: response.canonicalLink,
      lang: response.lang,
      description: response.description,
      occurrences: {
        body: response.ocurrences,
        title: response.appears_on_title
      },
      num_words: response.num_words,
      points: response.points });
  });
});


app.get('/', routes.index);
app.get('/users', user.list);

app.get('/analysis', function (req, res) {
  var url = req.query.url;
  var keyword = req.query.keyword;

  scraper.extract(url, keyword, function(response){
    res.render('analysis', {
      keyword: keyword,
      title: response.title,
      content: response.content,
      density: response.density,
      links: response.links,
      keyword_in_url: response.keyword_in_url,
      has_tags_related: response.has_tags_related,
      canonicalLink: response.canonicalLink,
      lang: response.lang,
      description: response.description,
      occurrences: {
        body: response.ocurrences,
        title: response.appears_on_title
      },
      num_words: response.num_words,
      points: response.points });
  });
});


app.use('/api', router);

var server = http.createServer(app);

reload(server, app);

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
