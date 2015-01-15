request = require("request")
extractor = require("unfluff")

extractDomain = (url) ->
  domain = undefined
  #find & remove protocol (http, ftp, etc.) and get domain
  if url.indexOf("://") > -1
    domain = url.split("/")[2]
  else
    domain = url.split("/")[0]  
  #find & remove port number
  domain = domain.split(":")[0]
  domain

countOcurrences = (str, value) ->
  regExp = new RegExp(value, "gi")
  (if str.match(regExp) then str.match(regExp).length else 0)

getNumExternalLinks = (str, url) ->
  external = 0
  internal = 0
  geturl = /[-a-zA-Z0-9@:%_\+.~#?&\/\/=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)?/g
  domain = extractDomain(url)
  urls = str.match(geturl)
  if urls.length > 0
    i = 0

    while i < urls.length
      (if not urls[i].indexOf(domain) then external++ else internal++)
      i++
  internal: internal
  external: external

calculateDensity = (num_words, num_occurrences) ->
  parseFloat(num_occurrences / num_words * 100).toFixed 2

bodyProcessing = (str, keyword) ->
  
  # Highlight keyword in body
  body = nl2br(str)
  body = highlightKeywords(str, keyword)
  
  # Num words in body
  num_words = countWords(stripHtml(str))
  
  # Retrieve num ocurrences of keyword from body
  num_occurrences = countOcurrences(str, keyword)
  
  # Density
  density = calculateDensity(num_words, num_occurrences)

  body: body
  num_words: num_words
  density: density
  num_occurrences: num_occurrences

stripHtml = (str) ->
  str.replace /(<([^>]+)>)/g, ""

countWords = (sentence) ->
  index = {}
  total = 0
  words = sentence.replace(/[.,?!;()"'-]/g, " ").replace(/\s+/g, " ").toLowerCase().split(" ")
  words.forEach (word) ->
    index[word] = 0  unless index.hasOwnProperty(word)
    index[word]++
    total++
    return

  total

nl2br = (str) ->
  str.replace "\n", "<br/>"

getContent = (url, callback) ->
  request url, (error, response, body) ->
    if not error and response.statusCode is 200
      analysis = extractor(body)
      callback analysis
    return

  return

highlightKeywords = (str, value) ->
  str.replace new RegExp(value, "gi"), "<span class=\"highlight\">$&</span>"

calculatePoints = (bodyObj, title, keyword, num_links) ->
  points = 0
  points += 10  if bodyObj.num_occurrences > 4
  if bodyObj.num_words > 200 and bodyObj.num_words <= 400
    points += 20
  else if bodyObj.num_words <= 1000
    points += 30
  else
    points += 50
  points += 5  if num_links.internal > 3
  points += 7  if num_links.external > 0
  points += 30  if countOcurrences(title, keyword) > 0
  points += 15  if bodyObj.density > 2
  points

exports.extract = (url, keyword, callback) ->
  getContent url, (content) ->
    title = highlightKeywords(content.title, keyword)
    bodyObj = bodyProcessing(content.text, keyword)
    links = getNumExternalLinks(content.text, url)
    points = calculatePoints(bodyObj, title, keyword, links)
    callback
      title: title
      body: bodyObj.body
      links: links
      density: bodyObj.density
      num_occurrences: bodyObj.num_occurrences
      num_words: bodyObj.num_words
      points: points

    return

  return
