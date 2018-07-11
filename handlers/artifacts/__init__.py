from chat import *
from concept import *
from markers import *
from project import *
from publish import *
from phrasing import *
from document import *
from crawlcontext import *
from miscellaneous import *
from selectedphrasing import *
from webapp2 import Route


artifact_url_mapping = [
    ('/?', ProjectHomeHandler),
    Route(r'/p/s/<document:\w+>/<group:\w+>', SummaryGroupPublishHandler),
    Route(r'/p/s/<document:\w+>/<group:\w+>/', SummaryGroupPublishHandler),
    Route(r'/p/s/<document:\w+>', SummaryPublishHandler),
    Route(r'/p/s/<document:\w+>/', SummaryPublishHandler),

    Route(r'/p/p/<document:\w+>/<group:\w+>', PresentationGroupPublishHandler),
    Route(r'/p/p/<document:\w+>/<group:\w+>/', PresentationGroupPublishHandler),
    Route(r'/p/p/<document:\w+>', PresentationPublishHandler),
    Route(r'/p/p/<document:\w+>/', PresentationPublishHandler),

    Route(r'/p/<document:\w+>/<group:\w+>', DocumentGroupPublishHandler),
    Route(r'/p/<document:\w+>/<group:\w+>/', DocumentGroupPublishHandler),
    Route(r'/p/<document:\w+>', DocumentPublishHandler),
    Route(r'/p/<document:\w+>/', DocumentPublishHandler),

    ('/project/import/(.*)/?', ProjectImporterHandler),
    ('/project/restore/(.*)/?', ProjectRestoreHandler),
    ('/project/(.*)/?', ProjectHandler),
    ('/analytic/?', AnalyticHandler),
    ('/concept/children/(.*)/?', ConceptChildrenHandler),
    ('/concept/(.*)/?', ConceptHandler),
    ('/phrasing/(.*)/?', PhrasingHandler),

    Route(r'/document/publish/status/<publish:\w+>', DocumentPublishStatus),
    Route(r'/document/publish/status/<publish:\w+>/', DocumentPublishStatus),

    Route(r'/presentation/publish/analytic/<project:\w+>/<concept:\w+>/<action:\w+>', PresentationPublishAnalyticHandler),
    Route(r'/presentation/publish/analytic/<project:\w+>/<concept:\w+>/<action:\w+>/', PresentationPublishAnalyticHandler),
    Route(r'/presentation/publish/<publish:\w+>', PresentationPublishHandler),
    Route(r'/presentation/publish/<publish:\w+>/', PresentationPublishHandler),

    Route(r'/summary/publish/analytic/<project:\w+>/<concept:\w+>/<action:\w+>', SummaryPublishAnalyticHandler),
    Route(r'/summary/publish/analytic/<project:\w+>/<concept:\w+>/<action:\w+>/', SummaryPublishAnalyticHandler),
    Route(r'/summary/publish/<publish:\w+>', SummaryPublishHandler),
    Route(r'/summary/publish/<publish:\w+>/', SummaryPublishHandler),

    Route(r'/document/publish/analytic/<project:\w+>/<concept:\w+>/<action:\w+>', DocumentPublishAnalyticHandler),
    Route(r'/document/publish/analytic/<project:\w+>/<concept:\w+>/<action:\w+>/', DocumentPublishAnalyticHandler),
    Route(r'/document/publish/<publish:\w+>', DocumentPublishHandler),
    Route(r'/document/publish/<publish:\w+>/', DocumentPublishHandler),

    ('/document/presentation/?', PresentationDocumentHandler),
    ('/document/summary/?', SummaryDocumentHandler),
    ('/document/(.*)/?', DocumentHandler),
    ('/selectedphrasing/presentation/(.*)/?', PresentationSelectedPhrasingHandler),
    ('/selectedphrasing/summary/(.*)/?', SummarySelectedPhrasingHandler),
    ('/selectedphrasing/(.*)/?', SelectedPhrasingHandler),
    ('/crawlcontext/presentation/(.*)/?', PresentationCrawlContextHandler),
    ('/crawlcontext/summary/(.*)/?', SummaryCrawlContextHandler),
    ('/crawlcontext/(.*)/?', CrawlContextHandler),
    ('/marker/annotation/(.*)/?', AnnotationHandler),
    ('/marker/annotation/?', AnnotationHandler),
    ('/media/download/(.*)/?', MediaDownloadHandler),
    ('/media/upload/(.*)/?', MediaUploadHandler),
    ('/search/project/?', SearchProjectHandler),
    ('/search/library/?', SearchLibraryHandler),
    ('/channel/token/', ChannelTokenHandler),
    # ('/monitor/server/(.*)/?', MonitoringHanlder),
    ('/chat/?', ChatHandler),
    ('/channel/token/?', ChannelTokenHandler),
    ('/channel/users/?', ChannelUsersHandler),
    ('/channel/ping/?', ChannelPingHandler),
    ('/_ah/channel/connected/?', ChannelConnectHandler),
    ('/_ah/channel/disconnected/?', ChannelDisconnectedHandler),
]