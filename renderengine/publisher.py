import logging
from models.account import User, Group
from models.artifacts import phrasing
from pyquery import PyQuery as Pq
from google.appengine.ext import ndb
from renderobject import RenderObject
from presentationrenderobj import Slide
from models.artifacts import attributes
from renderengine import AutoAttributeEngine


log = logging.getLogger(__file__)
__all__ = [
    'DocumentPublisherEngine',
    'SummaryPublisherEngine',
    'ConceptPublishWalker',
    'PresentationPublisherEngine',
]


class DocumentPublisherEngine(object):
    def __init__(self, pro, doc, group, organization=None):

        self.project = pro
        self.document = doc
        self.groups = [group.key, Group.get_worldshare().key]
        self.organization = organization

        self.user = User()
        self.user.groups = self.groups

        if organization:
            self.user.organization = organization.key

        self.html = ''
        self.body = Pq('<span></span>')

    def render(self):
        self._process_root()
        self._process_parent(self.project)
        self.html = self.body.html(method='html')

    def _process_root(self):
        attr = self.project.get_attr_by_doc(self.document)
        self.project.render_object = RenderObject()
        self.project.render_object.span = Pq('<span></span>')
        self.project.render_object.span.add_class('project_span')
        self.project.render_object.children_span = Pq('<span></span>')
        self.project.render_object.children_span.add_class('children_span')
        self.project.render_object.parent_children_span = Pq('<span></span>')
        self.project.render_object.parent_children_span.add_class('parent_children_span')

        if attr and attr.is_unordered_list():
            self.project.render_object.ul = Pq('<ul></ul>')
            self.project.render_object.ul.append(self.project.render_object.children_span)
            self.project.render_object.ul.append(self.project.render_object.parent_children_span)
            self.project.render_object.span.append(self.project.render_object.ul)
            self.project.render_object.cur_attr = attributes.UNORDERED_LIST

        elif attr and attr.is_ordered_list():
            self.project.render_object.ul = Pq('<ol></ol>')
            self.project.render_object.ul.append(self.project.render_object.children_span)
            self.project.render_object.ul.append(self.project.render_object.parent_children_span)
            self.project.render_object.span.append(self.project.render_object.ul)
            self.project.render_object.cur_attr = attributes.ORDERED_LIST

        else:
            self.project.render_object.span.append(self.project.render_object.children_span)
            self.project.render_object.span.append(self.project.render_object.parent_children_span)
            self.project.render_object.cur_attr = attributes.NONE

        self.body.append(self.project.render_object.span)

    def _process_parent(self, parent):
        children = ndb.get_multi(parent.children)
        parent_span = False
        for child in children:
            if not child or not child.has_permission_read(self.user):
                continue
            child.parent_obj = parent
            self._render(child, parent)
            if not child.is_parent() and not parent_span:
                parent.render_object.children_span.append(child.render_object.span.remove())
            else:
                parent_span = True
                parent.render_object.parent_children_span.append(child.render_object.span.remove())
            self._process_parent(child)

    def _render(self, concept, parent):
        concept.render_object = RenderObject()
        attr = concept.get_attr_by_doc(self.document)

        ordered_list = False
        unordered_list = False

        concept.render_object.span = Pq('<span></span>')
        concept.render_object.span.attr('id', concept.id)
        if attr:
            concept.render_object.span.attr('data-attr', ' '.join(attr.attributes))
        concept.render_object.span.add_class('concept')

        if not attr or (attr and not attr.is_no_list()):
            if not attr or (attr and not attr.is_unordered_list()):
                auto_list = AutoAttributeEngine.is_ordered_list(parent, None, self.document, user=self.user)
                if attr and attr.is_ordered_list():
                    ordered_list = True
                elif concept.is_parent() and auto_list:
                    ordered_list = True
            if not attr or (attr and not attr.is_ordered_list()):
                auto_list = AutoAttributeEngine.is_unordered_list(parent, None, self.document, user=self.user)
                if attr and attr.is_unordered_list():
                    unordered_list = True
                elif concept.is_parent() and auto_list:
                    unordered_list = True

        concept.render_object.render_as_ordered_list = ordered_list
        concept.render_object.render_as_unordered_list = unordered_list

        attr_str = AutoAttributeEngine.get_attr(concept, attr, doc=self.document, user=self.user)

        concept.render_object.span.attr('data-ordered-list', str(ordered_list))
        concept.render_object.span.attr('data-unordered-list', str(unordered_list))

        concept.render_object.phr_span = Pq('<span></span>')
        concept.render_object.phr_span.attr('id', '%s-%s' % (concept.id, 'phr_span'))
        concept.render_object.phr_span.add_class('phr_span')
        concept.render_object.span.append(concept.render_object.phr_span)

        if concept.is_parent():
            concept.render_object.more_icon = Pq('<i></i>')
            concept.render_object.more_icon.attr('id', '%s-%s' % (concept.id, 'more_icon'))
            concept.render_object.more_icon.add_class('fa fa-angle-double-right expand_child_inc move-icon')
            if not concept.depth >= 0:
                concept.render_object.more_icon.add_class('hidden')
            concept.render_object.span.append(concept.render_object.more_icon)

        concept.render_object.children_span = Pq('<span></span>')
        concept.render_object.children_span.attr('id', '%s-%s' % (concept.id, 'children_span'))
        concept.render_object.children_span.add_class('children_span')
        concept.render_object.span.append(concept.render_object.children_span)
        if concept.depth >= 0:
            concept.render_object.children_span.add_class('hidden')
            concept.render_object.children_span.attr('data-collapsed', 'true')

        concept.render_object.parent_children_span = Pq('<span></span>')
        concept.render_object.parent_children_span.attr('id', '%s-%s' % (concept.id, 'parent_children_span'))
        concept.render_object.parent_children_span.add_class('parent_children_span')
        concept.render_object.span.append(concept.render_object.parent_children_span)
        if concept.depth >= 0:
            concept.render_object.parent_children_span.add_class('hidden')
            concept.render_object.parent_children_span.attr('data-collapsed', 'true')

        self._render_text(concept)

        if attr_str == attributes.HEADER:
            self._render_header(concept)
        elif attr_str == attributes.PARAGRAPH:
            self._render_paragraph(concept)
        elif attr_str == attributes.IMAGE:
            self._render_image(concept)
        elif attr_str == attributes.NONE:
            self._render_none(concept)

        if ordered_list:
            self._render_ordered_list(concept)
        elif unordered_list:
            self._render_unordered_list(concept)

        if AutoAttributeEngine.is_list_item(concept, self.document, user=self.user):
            self._render_list_item(concept)

        concept.render_object.cur_attr = attr_str

    def _render_none(self, concept):
        pass

    def _render_image(self, concept):
        concept.render_object.img_figure = Pq('<figure></figure>')
        concept.render_object.img_figure.attr('id', '%s-%s' % (concept.id, 'img-figure'))
        concept.render_object.img_figure.add_class('img-figure')
        concept.render_object.phr_span.append(concept.render_object.img_figure)

        concept.render_object.img = Pq('<img>')
        concept.render_object.img.attr('id', '%s-%s' % (concept.id, 'concept-img'))
        concept.render_object.img.attr('alt', concept.get_phrasing(doc=self.document))
        concept.render_object.img.attr('src', '/media/download/%s' % concept.id)
        concept.render_object.img.add_class('concept-img img-full')
        concept.render_object.img_figure.append(concept.render_object.img)

        concept.render_object.img_caption = Pq('<figcaption></figcaption>')
        concept.render_object.img_caption.attr('id', '%s-%s' % (concept.id, 'caption'))
        concept.render_object.img_caption.append(concept.render_object.phr_text_span.remove())
        concept.render_object.img_caption.add_class('caption')
        concept.render_object.img_figure.append(concept.render_object.img_caption)

        concept.render_object.phr_text_span.remove_class('phr_text_span')
        concept.render_object.phr_text_span.add_class('phr_text_span_img')

    def _render_unordered_list(self, concept):
        concept.render_object.ul = Pq('<ul></ul>')
        concept.render_object.ul.attr('id', '%s-%s' % (concept.id, 'ul'))
        concept.render_object.ul.append(concept.render_object.children_span.remove())
        concept.render_object.ul.append(concept.render_object.parent_children_span.remove())
        concept.render_object.span.append(concept.render_object.ul)

    def _render_ordered_list(self, concept):
        concept.render_object.ol = Pq('<ol></ol>')
        concept.render_object.ol.attr('id', '%s-%s' % (concept.id, 'ol'))
        concept.render_object.ol.append(concept.render_object.children_span.remove())
        concept.render_object.ol.append(concept.render_object.parent_children_span.remove())
        concept.render_object.span.append(concept.render_object.ol)

    def _render_list_item(self, concept):
        concept.render_object.li = Pq('<li></li>')
        concept.render_object.li.attr('id', '%s-%s' % (concept.id, 'li'))
        concept.render_object.li.append(concept.render_object.phr_span.children().remove())
        concept.render_object.phr_span.append(concept.render_object.li)

        if AutoAttributeEngine.is_ordered_list(concept.get_parent(), None, self.document):
            concept.render_object.render_as_ordered_list = True
        elif AutoAttributeEngine.is_unordered_list(concept.get_parent(), None, self.document):
            concept.render_object.render_as_unordered_list = True

    def _render_paragraph(self, concept):
        concept.render_object.p = Pq('<p></p>')
        concept.render_object.p.attr('id', '%s-%s' % (concept.id, 'p'))
        concept.render_object.p.append(concept.render_object.span.children().remove())
        concept.render_object.span.append(concept.render_object.p)
        concept.render_object.span.append(concept.render_object.parent_children_span.remove())

    def _render_header(self, concept):
        hl = concept.depth + 1
        if hl > 6:
            hl = 6
        concept.render_object.header = Pq('<h%s></h%s>' % (hl, hl))
        concept.render_object.header.attr('id', '%s-%s' % (concept.id, 'header'))
        concept.render_object.header.append(concept.render_object.phr_text_span.remove())
        concept.render_object.phr_span.append(concept.render_object.header)
        if concept.render_object.more_icon:
            concept.render_object.header.append(concept.render_object.more_icon)

    def _render_text(self, concept):
        phrasing_text = concept.get_phrasing(doc=self.document)
        if not phrasing_text:
            concept.get_phrasing()

        concept.render_object.phr_text_span = Pq('<span></span>')
        concept.render_object.phr_text_span.attr('id', '%s-%s' % (concept.id, 'phr_text_span'))
        concept.render_object.phr_text_span.add_class('phr_text_span')
        concept.render_object.phr_text_span.append(phrasing_text + ' ')
        concept.render_object.phr_span.append(concept.render_object.phr_text_span)


class ConceptPublishWalker(object):
    def __init__(self, pro):
        self.project = pro
        self.parents = [pro]

    def __iter__(self):
        return self

    def _get_next_level(self):
        next_parents = []
        next_children = []

        for par in self.parents:
            children = ndb.get_multi(par.children)
            if len(children) > 0:
                next_parents += children
                next_children.append(children)
        self.parents = next_parents
        return next_children

    def next(self):
        class MostImportantChildIter(object):
            def __init__(self, children):
                self.children = children
                self.index = 0

            def __iter__(self):
                return self

            def _get_next_child(self, parent):
                child = None
                while not child and len(parent) > 0:
                    child = parent.pop(0)
                return child

            def next(self):
                child = None

                while not child and len(self.children) > 0:
                    child = self._get_next_child(self.children[self.index])
                    if len(self.children[self.index]) == 0:
                        self.children.pop(self.index)
                    else:
                        self.index += 1
                    if self.index >= len(self.children):
                        self.index = 0

                if child:
                    return child
                else:
                    raise StopIteration()

        next_parents = self._get_next_level()
        if next_parents:
            return MostImportantChildIter(next_parents)
        else:
            raise StopIteration()


class SummaryPublisherEngine(object):
    def __init__(self, pro, doc, wc, group, organization=None):
        self.project = pro
        self.document = doc
        self.word_count = wc
        self.groups = [group.key, Group.get_worldshare().key]
        self.organization = organization

        self.user = User()
        self.user.groups = self.groups
        self.walker = ConceptPublishWalker(pro)

        if organization:
            self.user.organization = organization.key

        self.html = ''
        self.body = Pq('<span></span>')
        self.con_count = 0
        self.paragraph = None

    def _get_next_concept(self):
        for level in self.walker:
            for concept in level:
                yield concept

    def render(self):
        cur_wc = 0
        concept_count = 0
        processed_concepts = {}

        for concept in self._get_next_concept():
            if concept:
                if not concept.has_permission_read(self.user):
                    continue

                render = True
                if not concept.is_summary_crawlable(document=self.document, project=self.project):
                    render = False

                attr = concept.get_attr_by_doc(self.document)
                if attr and attr.is_header():
                    render = False
                if attr and attr.is_image():
                    render = False

                if render:
                    phrase = concept.get_phrasing(doc=self.document, return_text=False)
                    wc = phrase.get_word_count()
                    if wc + cur_wc > self.word_count:
                        break
                    concept_count += 1
                    cur_wc += wc

                parent = concept.get_parent()
                if not processed_concepts.get(parent.id):
                    processed_concepts[parent.id] = []
                processed_concepts[parent.id].append(concept)

        paragraph_divider = 300
        paragraph_count = cur_wc / paragraph_divider
        if cur_wc % paragraph_divider > 0:
            paragraph_count += 1

        con_pre_par = (concept_count / paragraph_count) + 1
        self.paragraph = Pq('<p></p>')
        self.body.append(self.paragraph)
        self.con_count = 0
        self._render(self.project, con_pre_par, processed_concepts)
        self.html = self.body.html(method='html')

    def _render(self, parent, con_pre_par, processed_concepts):
        if not processed_concepts.get(parent.id):
            return
        for concept in processed_concepts.get(parent.id):
            render = True
            if not concept.is_summary_crawlable(document=self.document, project=self.project):
                render = False

            attr = concept.get_attr_by_doc(self.document)
            if attr and attr.is_header():
                render = False
            if attr and attr.is_image():
                render = False

            if render:
                if self.con_count == con_pre_par:
                    self.con_count = 0
                    self.paragraph = Pq('<p></p>')
                    self.body.append(self.paragraph)

                phrase = concept.get_summary_phrasing(document=self.document)
                span = Pq('<span></span>')
                span.append(phrase.text + ' ')
                # span.css('background-color', ChannelToken.generate_color())
                self.paragraph.append(span)
                self.con_count += 1
            self._render(concept, con_pre_par, processed_concepts)


class PresentationPublisherEngine(object):
    def __init__(self, pro, doc, sc, minb, maxb, group, organization=None):
        self.project = pro
        self.document = doc
        self.slide_count = sc
        self.min_bullet = minb
        self.max_bullet = maxb
        self.groups = [group.key, Group.get_worldshare().key]
        self.organization = organization

        self.user = User()
        self.user.groups = self.groups
        self.walker = ConceptPublishWalker(pro)

        if organization:
            self.user.organization = organization.key

        self.html = ''
        self.body = Pq('<div></div>')
        self.body.attr('id', 'presentation-div')
        self.body.add_class('')
        self.con_count = 0
        self.slides = []
        self.cur_y = 0
        self.y_step = 525

    def _get_next_concept(self):
        for level in self.walker:
            for concept in level:
                yield concept

    def render(self):
        self._generate_slides()
        self._render_slides()

        press_wrapper = Pq('<div></div>')
        press_wrapper.attr('id', 'pres_wrapper')
        press_wrapper.append(self.body)
        self.html = press_wrapper.outer_html()

    def _generate_slides(self):
        con_slides = {}
        slide = Slide()
        con_slides[self.project.id] = slide

        for concept in self._get_next_concept():
            if concept:
                if not concept.has_permission_read(self.user):
                    continue
                if not concept.is_presentation_crawlable(document=self.document, project=self.project):
                    continue

                attr = concept.get_attr_by_doc(self.document)
                is_image = attr and attr.is_image()
                parent = concept.get_parent()

                if (is_image or concept.is_parent(user=self.user)) and parent.id in con_slides:
                    unprocessed_children = concept.get_children(user=self.user)

                    if not is_image and len(unprocessed_children) < self.min_bullet:
                        continue

                    processed_children = []
                    if is_image:
                        num_slide = 1
                    else:
                        for child in unprocessed_children:
                            child_attr = child.get_attr_by_doc(self.document)
                            if not child_attr or not child_attr.is_image():
                                processed_children.append(child)

                        num_slide = len(processed_children) / self.max_bullet
                        remainder = len(processed_children) % self.max_bullet
                        if remainder >= self.min_bullet:
                            num_slide += 1

                    if num_slide == 0:
                        continue

                    par_slide = con_slides[parent.id]

                    for i in xrange(num_slide):
                        slide = Slide()
                        slide.parent = par_slide
                        slide.concept = concept
                        slide.is_image = is_image
                        slide.is_continue = i > 0
                        par_slide.slides.append(slide)
                        con_slides[concept.id] = slide
                        self.slides.append(slide)

                        min_index = i * self.max_bullet
                        max_index = min_index + self.max_bullet
                        slide.bullets = processed_children[min_index: max_index]

                        if len(self.slides) == self.slide_count:
                            break

                if len(self.slides) == self.slide_count:
                    break

    def _render_slides(self):
        for slide in self.slides:
            concept = slide.concept
            parent = concept.get_parent()

            div = Pq('<div></div>')
            span = Pq('<span></span>')
            div.append(span)

            self.body.append(div)
            div.add_class('pres_slide step')
            div.attr('data-y', str(self.cur_y))
            self.cur_y += self.y_step

            if parent.is_root() and concept.is_image(self.document.key):
                text = parent.title
                text = phrasing.distill_with_threshold(text, capitalization=phrasing.CAPITALIZE_TITLE)
            elif slide.is_image:
                sel_phr = parent.get_presentation_selected_phrasing(document=self.document)
                if sel_phr:
                    text = sel_phr.phrasing.get().text
                else:
                    text = parent.get_presentation_phrasing(self.document).text
                    text = phrasing.distill_with_threshold(text, capitalization=phrasing.CAPITALIZE_TITLE)
            else:
                sel_phr = concept.get_presentation_selected_phrasing(document=self.document)
                if sel_phr:
                    text = sel_phr.phrasing.get().text
                else:
                    text = concept.get_presentation_phrasing(self.document).text
                    text = phrasing.distill_with_threshold(text, capitalization=phrasing.CAPITALIZE_TITLE)

            h = Pq('<h1></h1>')
            header_span = Pq('<span></span>')
            header_span.add_class('presentation_span')
            header_span.append(text)
            h.append(header_span)
            span.append(h)

            if slide.is_image:
                caption = Pq('<h5></h5>')
                caption.add_class('pres-caption')
                caption.add_class('presentation_span')
                text = concept.get_presentation_phrasing(self.document).text
                caption.append(phrasing.distill_with_threshold(text))
                image_container = Pq('<center></center>')
                img = Pq('<img>')
                img.add_class('slide-img')
                img.attr('src', '/media/download/%s' % concept.id)
                image_container.append(img)
                image_container.append(caption)
                span.append(image_container)
            else:
                ul = Pq('<ul></ul>')
                ul.attr('data-bullet-count', str(len(slide.bullets)))
                span.append(ul)
                for bullet in slide.bullets:
                    li = Pq('<li></li>')
                    bullet_span = Pq('<span></span>')
                    bullet_span.add_class('presentation_span')
                    text = bullet.get_presentation_phrasing(self.document).text
                    bullet_span.append(phrasing.distill_with_threshold(text))
                    li.append(bullet_span)
                    ul.append(li)

