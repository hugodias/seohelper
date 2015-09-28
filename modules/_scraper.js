var Scraper, extractor, request;

request = require("request");

extractor = require("unfluff");

Scraper = (function() {
  function Scraper(url1, keyword1) {
    this.url = url1;
    this.keyword = keyword1;
    this.links = {
      internal: 0,
      external: 0
    };
    this.density = 0;
    this.ocurrences = 0;
    this.num_words = 0;
    this.appears_on_title = false;
    this.keyword_in_url = false;
    this.has_tags_related = false;
    this.points = 0;
    this.title = null;
    this.body = null;
    this.content = null;
    this.canonicalLink = null;
    this.lang = null;
    this.description = null;
  }

  Scraper.prototype.extractDomain = function(url) {
    var domain;
    domain = void 0;
    if (url.indexOf("://") > -1) {
      domain = url.split("/")[2];
    } else {
      domain = url.split("/")[0];
    }
    return domain.split(":")[0];
  };

  Scraper.prototype.countWords = function(sentence) {
    var index, total, words;
    index = {};
    total = 0;
    words = sentence.replace(/[.,?!;()"'-]/g, " ").replace(/\s+/g, " ").toLowerCase().split(" ");
    words.forEach(function(word) {
      if (!index.hasOwnProperty(word)) {
        index[word] = 0;
      }
      index[word]++;
      total++;
    });
    return this.num_words = total;
  };

  Scraper.prototype.countOcurrences = function(str, value) {
    var regExp;
    regExp = new RegExp(value, "gi");
    if (str.match(regExp)) {
      return str.match(regExp).length;
    } else {
      return 0;
    }
  };

  Scraper.prototype.extractNumExternalLinks = function(str) {
    var domain, geturl, i, results, urls;
    geturl = /[-a-zA-Z0-9@:%_\+.~#?&\/\/=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)?/g;
    domain = this.extractDomain(this.url);
    console.log(str);
    urls = str.match(geturl);
    if (urls.length > 0) {
      i = 0;
      results = [];
      while (i < urls.length) {
        if (!urls[i].indexOf(domain)) {
          this.links.external++;
        } else {
          this.links.internal++;
        }
        results.push(i++);
      }
      return results;
    }
  };

  Scraper.prototype.calculateDensity = function(num_words, num_occurrences) {
    this.density = parseFloat(num_occurrences / num_words * 100).toFixed(2);
  };

  Scraper.prototype.stripHtml = function(str) {
    return str.replace(/(<([^>]+)>)/g, "");
  };

  Scraper.prototype.nl2br = function(str) {
    this.content = str.replace("\n", "<br/>");
    return this;
  };

  Scraper.prototype.highlightKeywords = function(value, src) {
    var content;
    if (src) {
      content = src;
    } else {
      content = this.content;
    }
    return content.replace(new RegExp(value, "gi"), "<span class=\"highlight\">$&</span>");
  };

  Scraper.prototype.calculatePoints = function() {
    if (this.num_occurrences > 4) {
      this.points += 5;
    }
    if (this.links.internal > 3) {
      this.points += 5;
    }
    if (this.has_tags_related) {
      this.points += 5;
    }
    if (this.links.external > 0) {
      this.points += 7;
    }
    if (this.density > 2) {
      this.points += 15;
    }
    if (this.keyword_in_url) {
      this.points += 15;
    }
    if (this.appears_on_title) {
      this.points += 30;
    }
    if (this.num_words > 400 && this.num_words < 700) {
      return this.points += 10;
    } else if (this.num_words < 1000) {
      return this.points += 20;
    } else if (this.num_words < 1500) {
      return this.points += 30;
    } else {
      return this.points += 40;
    }
  };

  Scraper.prototype.getContent = function(url, callback) {
    request(url, function(error, response, body) {
      var analysis;
      if (!error && response.statusCode === 200) {
        analysis = extractor(body);
        callback(analysis);
      }
    });
  };

  Scraper.prototype.to_slug = function(str) {
    var from, i, j, ref, ref1, to;
    str = str.replace(/^\s+|\s+$/g, "").toLowerCase();
    from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
    to = "aaaaeeeeiiiioooouuuunc------";
    for (i = j = ref = i, ref1 = from.length; ref <= ref1 ? j <= ref1 : j >= ref1; i = ref <= ref1 ? ++j : --j) {
      str = str.replace(new RegExp(from.charAt(i), "g"), to.charAt(i));
    }
    str = str.replace(/[^a-z0-9 -]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
    return str;
  };

  Scraper.prototype.process = function(response) {
    this.body = response.text;
    this.title = this.highlightKeywords(this.keyword, response.title);
    this.description = this.highlightKeywords(this.keyword, response.description);
    this.canonicalLink = response.canonicalLink;
    this.lang = response.lang;
    this.tags = response.tags;
    this.content = this.nl2br(this.body).highlightKeywords(this.keyword, null);
    this.countWords(this.stripHtml(response.text));
    this.ocurrences = this.countOcurrences(response.text, this.keyword);
    if (this.countOcurrences(response.title, this.keyword) > 0) {
      this.appears_on_title = true;
    }
    if (this.url.indexOf(this.to_slug(this.keyword) > -1)) {
      this.keyword_in_url = true;
    }
    this.calculateDensity(this.num_words, this.ocurrences);
    if (this.tags.indexOf(this.to_slug(this.keyword) > -1)) {
      this.has_tags_related = true;
    }
    return this.calculatePoints();
  };

  Scraper.prototype.responseObj = function() {
    return {
      title: this.title,
      body: this.body,
      description: this.description,
      lang: this.lang,
      canonicalLink: this.canonicalLink,
      links: this.links,
      density: this.density,
      ocurrences: this.ocurrences,
      appears_on_title: this.appears_on_title === true ? "Yes" : "No",
      keyword_in_url: this.keyword_in_url === true ? "Yes" : "No",
      has_tags_related: this.has_tags_related === true ? "Yes" : "No",
      num_words: this.num_words,
      points: this.points,
      content: this.content
    };
  };

  Scraper.prototype.analyse = function(callback) {
    var _this;
    _this = this;
    return this.getContent(this.url, function(response) {
      _this.process(response);
      return callback(_this.responseObj());
    });
  };

  return Scraper;

})();

exports.extract = function(url, keyword, callback) {
  var scraper;
  scraper = new Scraper(url, keyword);
  scraper.analyse(callback);
};
