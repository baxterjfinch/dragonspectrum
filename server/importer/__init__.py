import webapp2


class MainHandler(webapp2.RequestHandler):
    def get(self):
        raise NotImplementedError()


URL_MAPPING = [
    webapp2.Route('/', handler=MainHandler, name='main'),
]

app = webapp2.WSGIApplication(URL_MAPPING, debug=True)

