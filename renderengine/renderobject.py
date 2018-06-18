class RenderObject(object):
    def __init__(self):
        self.is_rendered = False
        self.cur_attr = None
        self.render_as_ordered_list = False
        self.render_as_unordered_list = False

        self.span = None
        self.phr_span = None
        self.phr_text_span = None
        self.children_span = None
        self.parent_children_span = None
        self.more_icon = None
        self.anno_parent_icon = None
        self.anno_icon = None

        self.header = None
        self.header_level = None
        self.p = None
        self.ol = None
        self.ul = None
        self.li = None

        self.img_figure = None
        self.img_icon_span = None
        self.img = None
        self.img_caption = None

    @property
    def is_rendered_list(self):
        return self.render_as_ordered_list or self.render_as_unordered_list