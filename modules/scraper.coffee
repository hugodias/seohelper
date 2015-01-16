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
    @points = 0
    @title = null
    @body = null
    @content = null

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
    @points += 10  if @num_occurrences > 4
    # Internal links are importante
    @points += 5  if @links.internal > 3
    # External links even more
    @points += 7  if @links.external > 0
    # Keyword on post title?
    @points += 30  if @appears_on_title
    # Density of keywords
    @points += 15  if @density > 2

    if @num_words > 200 and @num_words <= 400
      @points += 20
    else if @num_words <= 1000
      @points += 30
    else
      @points += 50    

  # Extract all information abount an URL using unfluff
  getContent: (url, callback) ->
    request url, (error, response, body) ->
      if not error and response.statusCode is 200
        analysis = extractor(body)
        callback analysis
      return

    return
  
  process: (body, title) ->
    @body = body
    @title = @highlightKeywords(@keyword, title)

    # Highlight keyword in body
    @content = @nl2br(@body).highlightKeywords(@keyword, null)
    
    # Num words in body
    @countWords(@stripHtml(body))
    
    # Retrieve num ocurrences of keyword from body
    @ocurrences = @countOcurrences(body, @keyword)

    # Retrieve num of occurrences of keyword from title
    @appears_on_title = true if @countOcurrences(title, @keyword) > 0

    # Density
    @calculateDensity(@num_words, @ocurrences)

    # Extract num links
    @extractNumExternalLinks(body)

    # Calculate points
    @calculatePoints()

  responseObj: ->
    title: @title
    body: @body
    links: @links
    density: @density
    ocurrences : @ocurrences 
    appears_on_title: if @appears_on_title is true then "Yes" else "No"
    num_words: @num_words
    points: @points
    content: @content

  analyse: (callback) ->
    _this = @
    @getContent @url, (response) ->
      _this.process(response.text, response.title)

      callback _this.responseObj()

exports.extract = (url, keyword, callback) ->
  scraper = new Scraper(url, keyword)
  scraper.analyse(callback)
  return
