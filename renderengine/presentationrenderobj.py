from pyquery import PyQuery as Pq


class PresentationRenderObj(object):
    __slots__ = [
        'div',
        'slide_span',
        'heading',
        'listUL',
        'caption',
    ]

    def __init__(self):
        self.div = Pq('<div></div>')
        self.slide_span = Pq('<span></span>')
        self.heading = Pq('<h1></h1>')
        self.listUL = Pq('<ul></ul>')
        self.caption = Pq('<h5 class="pres-caption"></h5>')
        self.slide_span.append(self.heading)
        self.slide_span.append(self.listUL)
        self.div.append(self.slide_span)


class Slide(object):
    __slots__ = [
        'parent',
        'slides',
        'concept',
        'bullets',
        'render_obj',
        'is_continue',
        'is_image'
    ]

    def __init__(self):
        self.parent = None
        self.slides = []
        self.concept = None
        self.bullets = []
        self.render_obj = None
        self.is_continue = False
        self.is_image = False