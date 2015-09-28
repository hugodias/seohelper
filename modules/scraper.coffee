request = require("request")
extractor = require("unfluff")

class Scraper
  constructor: (@url, @keyword) ->
    @links =
      internal: 0
      external: 0
    @density = 0
    @ocurrences = 0
    @num_words = 0
    @appears_on_title = false
    @keyword_in_url = false
    @has_tags_related = false
    @points = 0
    @title = null
    @body = null
    @content = null
    @canonicalLink = null
    @lang = null
    @description = null

  extractDomain: (url) ->
    domain = undefined
    #find & remove protocol (http, ftp, etc.) and get domain
    if url.indexOf("://") > -1
      domain = url.split("/")[2]
    else
      domain = url.split("/")[0]
    #find & remove port number
    domain.split(":")[0]

  countWords: (sentence) ->
    index = {}
    total = 0
    words = sentence.replace(/[.,?!;()"'-]/g, " ").replace(/\s+/g, " ").toLowerCase().split(" ")
    words.forEach (word) ->
      index[word] = 0  unless index.hasOwnProperty(word)
      index[word]++
      total++
      return
    @num_words = total

  countOcurrences: (str, value) ->
    regExp = new RegExp(value, "gi")
    (if str.match(regExp) then str.match(regExp).length else 0)

  extractNumExternalLinks: (str) ->
    geturl = /[-a-zA-Z0-9@:%_\+.~#?&\/\/=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)?/g
    domain = @extractDomain(@url)
    console.log str
    urls = str.match(geturl)
    if urls.length > 0
      i = 0

      while i < urls.length
        (if not urls[i].indexOf(domain) then @links.external++ else @links.internal++)
        i++

  calculateDensity: (num_words, num_occurrences) ->
    @density = parseFloat(num_occurrences / num_words * 100).toFixed 2
    return

  stripHtml: (str) ->
    str.replace /(<([^>]+)>)/g, ""

  nl2br: (str) ->
    @content = str.replace "\n", "<br/>"
    @

  highlightKeywords: (value, src) ->
    if src then content = src else content = @content
    content.replace new RegExp(value, "gi"), "<span class=\"highlight\">$&</span>"

  calculatePoints: ->
    # Number of occurrences from the keyword on page
    @points += 5 if @num_occurrences > 4
    # Internal links are importante
    @points += 5 if @links.internal > 3
    # Has keyword in tags?
    @points += 5 if @has_tags_related
    # External links even more
    @points += 7 if @links.external > 0
    # Density of keywords
    @points += 15 if @density > 2
    # Keyword on URL?
    @points += 15 if @keyword_in_url
    # Keyword on post title?
    @points += 30 if @appears_on_title


    if @num_words > 400 and @num_words < 700
      @points += 10
    else if @num_words < 1000
      @points += 20
    else if @num_words < 1500
      @points += 30
    else
      @points += 40

  # Extract all information abount an URL using unfluff
  getContent: (url, callback) ->
    request url, (error, response, body) ->
      if not error and response.statusCode is 200
        analysis = extractor(body)
        callback analysis
      return

    return

  to_slug: (str) ->
    str = str.replace(/^\s+|\s+$/g, "").toLowerCase() # trim and force lowercase
    from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;"
    to   = "aaaaeeeeiiiioooouuuunc------"
    for i in [i..from.length]
      str = str.replace(new RegExp(from.charAt(i), "g"), to.charAt(i))
    # remove accents, swap ñ for n, etc
    str = str
          .replace(/[^a-z0-9 -]/g, "")
          .replace(/\s+/g, "-").replace(/-+/g, "-")
    return str # unnecessary line, but for clarity

  process: (response) ->
    @body = response.text
    @title = @highlightKeywords(@keyword, response.title)
    @description = @highlightKeywords(@keyword, response.description)
    @canonicalLink = response.canonicalLink
    @lang = response.lang
    @tags = response.tags

    # Highlight keyword in body
    @content = @nl2br(@body).highlightKeywords(@keyword, null)

    # Num words in body
    @countWords(@stripHtml(response.text))

    # Retrieve num ocurrences of keyword from body
    @ocurrences = @countOcurrences(response.text, @keyword)

    # Retrieve num of occurrences of keyword from title
    @appears_on_title = true if @countOcurrences(response.title, @keyword) > 0

    # Check if the keyword appears in the URL
    @keyword_in_url = true if @url.indexOf(@to_slug(@keyword) > -1)

    # Density
    @calculateDensity(@num_words, @ocurrences)

    # Check if the keyword appers in the Tags
    @has_tags_related = true if @tags.indexOf(@to_slug(@keyword) > -1)

    # Extract num links NOT WORKING
    # @extractNumExternalLinks(body)

    # Calculate points
    @calculatePoints()

  responseObj: ->
    title: @title
    body: @body
    description: @description
    lang: @lang
    canonicalLink: @canonicalLink
    links: @links
    density: @density
    ocurrences : @ocurrences
    appears_on_title: if @appears_on_title is true then "Yes" else "No"
    keyword_in_url: if @keyword_in_url is true then "Yes" else "No"
    has_tags_related: if @has_tags_related is true then "Yes" else "No"
    num_words: @num_words
    points: @points
    content: @content

  analyse: (callback) ->
    _this = @
    @getContent @url, (response) ->
      _this.process(response)

      callback _this.responseObj()

exports.extract = (url, keyword, callback) ->
  scraper = new Scraper(url, keyword)
  scraper.analyse(callback)
  return
