import setup_paths
import bs4
import nltk.data
import logging
import sys
import datetime
import traceback
from StringIO import StringIO
from uuid import uuid1
from urlparse import urlparse
import server
from server import ttindex, tt_logging
import requests
from models.artifacts import Concept, Project, Phrasing, Attributes, Permission, Document, CrawlContext
from models.importer import Importer
import cloudstorage as gcs
from bs4 import BeautifulSoup
from google.appengine.ext import ndb, blobstore
from google.appengine.api import urlfetch, images
from google.appengine.ext import deferred
from google.appengine.api import memcache

log = logging.getLogger('tt')


class ImporterTask:
    def __init__(self):
        self.user = None
        self.id = self.create_uuid()
        self.url = None
        self.project = None
        self.document = None
        self.tag_count = 0
        self.tag_processed = 0
        self.concept_array = {}
        self.last_concept = None
        self.crawlcontext_array = []
        self.attribute_array = {}
        self.phrasing_array = []
        self.prems_array = []
        self.image_tags = []
        self.tags = None
        self.tag_index = -1
        self.sent_tok = None

    @staticmethod
    def import_project(command, request, user):
        if 'website' in command:
            importer = HTMLImporter()
            importer.user = user
            importer.url = request['url']
            importer_status = Importer(id=importer.id, importer_status='not started')
            importer_status.put()
            log.info('User imported website: %s', request['url'], extra={'user': user})
            deferred.defer(importer.import_website, request['url'], analytic_session=request['analytic_session'],
                           _queue='importer')
        elif 'wikipedia' in command:
            importer = Wikipediaimporter()
            importer.user = user
            importer.url = request['url']
            importer_status = Importer(id=importer.id, importer_status='not started')
            importer_status.put()
            log.info('User imported wikipedia page: %s', request['url'], extra={'user': user})
            deferred.defer(importer.import_website, request['url'], analytic_session=request['analytic_session'],
                           _queue='importer')
        elif 'html' in command:
            importer = HTMLImporter()
            importer.user = user
            importer_status = Importer(id=importer.id, importer_status='not started')
            importer_status.put()
            log.info('User imported html file: %s', request['title'], extra={'user': user})
            filename = '/' + server.GCS_BUCKET_NAME + '/importerdata/' + importer.id
            f = gcs.open(filename, mode='w', content_type='text/text')
            f.write(request['html'].encode('UTF-8'))
            f.close()
            deferred.defer(importer.import_website, None, request['title'], _queue='importer')
        elif 'text' in command:
            importer = TextImporter()
            importer.user = user
            importer_status = Importer(id=importer.id, importer_status='not started')
            importer_status.put()
            log.info('User imported text file: %s', request['title'], extra={'user': user})
            filename = '/' + server.GCS_BUCKET_NAME + '/importerdata/' + importer.id
            f = gcs.open(filename, mode='w', content_type='text/text')
            f.write(request['text'].encode('UTF-8'))
            f.close()
            deferred.defer(importer.import_text, None, request['title'], _queue='importer')
        else:
            return {'failed': 'no command given'}
        return {'started': 'check back later', 'importer_id': importer.id}

    @staticmethod
    def create_uuid():
        return uuid1().get_hex()

    @staticmethod
    def get_importer_status(import_id):
        status = memcache.get(key=import_id + '_status')
        if status:
            if status == 'running':
                tc = memcache.get(key=import_id + '_tag_count')
                tp = memcache.get(key=import_id + '_tag_processed')
                if tc is not None and tp is not None:
                    status = {'status': 'running', 'data': {'tag_count': tc, 'tag_processed': tp}}

            elif status == 'finished':
                status = {'status': 'finished', 'project': memcache.get(key=import_id + '_result')}

            elif status == 'failed':
                reason = memcache.get(key=import_id + '_reason')
                if not reason:
                    reason = 'unknown'
                status = {'error': 'importer failed', 'reason': reason}
            else:
                status = {'status': 'unknown'}
        else:
            importer_status = Importer.get_by_id(import_id)
            if importer_status.importer_status == 'not started':
                status = {'status': 'not started'}
            elif importer_status.importer_status == 'finished':
                status = {'status': 'finished', 'project': memcache.get(key=import_id + '_result')}
            elif importer_status.importer_status == 'failed':
                reason = importer_status.importer_reason
                if not reason:
                    reason = 'unknown'
                status = {'error': 'importer failed', 'reason': reason}

        return status

    @staticmethod
    def get_importer_results(import_id):
        importer_results = {'failed': 'no results for ' + import_id}
        project_id = memcache.get(key=import_id + '_result')
        if project_id is not None:
            importer_results = {'results': project_id}
            importer = Importer.get_by_id(import_id)
            if importer is not None:
                importer.key.delete()

        return importer_results

    def create_new_project(self, title):
        doc_perm = Permission(key=Permission.create_key(),
                              permissions=Permission.init_perm_struct(Document.operations_list))
        pro_perm = Permission(key=Permission.create_key(),
                              permissions=Permission.init_perm_struct(Project.operations_list))
        self.document = Document(key=Document.create_key(), title='Outline', owner=[self.user.key],
                                 permissions=doc_perm.key, subtitle='Outline', author=self.user.username,
                                 version='v0.1', date=str(datetime.datetime.now().year), copyright_text='',
                                 description='')
        self.project = Project(key=Project.create_key(), title=title, distilled_document=self.document.key,
                               permissions=pro_perm.key, owner=[self.user.key])
        self.document.project = self.project.key
        self.document.parent_perms.append(pro_perm.key)
        if self.user.in_org():
            self.document.organization = self.user.organization
            self.project.organization = self.user.organization
        doc_perm.artifact = self.document.key
        doc_perm.project = self.project.key
        pro_perm.artifact = self.project.key
        pro_perm.project = self.project.key
        ndb.put_multi([doc_perm, pro_perm, self.document, self.project])

    def process_list(self, tag, parent=None, set_attr=True):
        first = True
        for li in tag.children:
            children_lists = []
            if isinstance(li, bs4.Tag):
                for child in li.contents:
                    if child.name == 'ul' or child.name == 'ol':
                        ch_li = child.extract()
                        self.tags.remove(ch_li)
                        children_lists.append(ch_li)
                concept = self.create_new_concept(HTMLImporter.get_strings(li), parent)
                if first:
                    if set_attr:
                        par = parent
                        if not parent:
                            par = self.project
                        if len(par.attributes) == 0:
                            attribute = self.create_new_attribute(tag.name)
                            attribute.concept = par.key
                            attribute.attributes.append(tag.name)
                            par.attributes.append(attribute.key)
                        else:
                            attribute = self.attribute_array.get(par.attributes[0].id())
                            par.attributes.append(attribute.key)
                    first = False
                for child_list in children_lists:
                    self.process_list(child_list, parent=concept, set_attr=False)
        self.incr_tag_processed()

    def create_new_concept(self, phrasing_text, parent=None, attribute=None):
        phr_perm = Permission(permissions=Permission.init_perm_struct(Phrasing.operations_list),
                              key=Permission.create_key(), project=self.project.key)
        con_perm = Permission(permissions=Permission.init_perm_struct(Concept.operations_list),
                              key=Permission.create_key(), project=self.project.key)
        phrasing = Phrasing(key=Phrasing.create_key(), text=phrasing_text,
                            owner=[self.user.key], permissions=phr_perm.key,
                            originating_document=self.document.key, project=self.project.key)
        crawlcontext = CrawlContext(key=CrawlContext.create_key(), project=self.project.key,
                                    document=self.document.key, crawl=True)
        concept = Concept(
            key=Concept.create_key(),
            owner=[self.user.key],
            parent=parent.key if parent else None,
            project=self.project.key,
            distilled_phrasing=phrasing.key,
            phrasings=[phrasing.key],
            crawlcontext=[crawlcontext.key],
            permissions=con_perm.key
        )
        self.last_concept = concept
        crawlcontext.concept = concept.key
        if attribute:
            concept.attributes = [attribute.key]
            attribute.concept = concept.key
        if parent:
            parent.children.append(concept.key)
            concept.parent_perms = parent.parent_perms
            concept.parent_perms.append(parent.permissions)
        else:
            self.project.children.append(concept.key)
            concept.parent_perms.append(self.project.permissions)
        phr_perm.artifact = phrasing.key
        con_perm.artifact = concept.key
        phrasing.concept = concept.key
        if self.user.in_org():
            phrasing.organization = self.user.organization
            concept.organization = self.user.organization
        self.concept_array[concept.key.id()] = concept
        self.crawlcontext_array.append(crawlcontext)
        self.phrasing_array.append(phrasing)
        self.prems_array += [phr_perm, con_perm]
        return concept

    def p_tags_left(self):
        for i in range(self.tag_index + 1, len(self.tags)):
            if self.tags[i].name == 'p':
                return True
        return False

    def create_new_attribute(self, att):
        attribute = Attributes(key=Attributes.create_key(), project=self.project.key,
                               document=self.document.key, attributes=[att])
        self.attribute_array[attribute.key.id()] = attribute
        return attribute

    def split_paragraph_into_sentences(self, paragraph):
        sentence_list = self.sent_tok.tokenize(paragraph.strip(), realign_boundaries=True)

        return sentence_list

    def index_phrasings(self, phrs):
        ids = []
        docs = []
        for p in phrs:
            id_, doc = p.get_index_doc()
            ids.append(id_)
            docs.append(doc)
        indexes_ = self.user.get_put_index()
        for i in xrange(0, len(ids), 200):  # Can only index 200 at a time
            ttindex.index_multi_artifact(indexes_, ids[i:i + 200], docs[i:i + 200])

    def set_tag_count(self, count):
        self.tag_count = count
        memcache.add(key=str(self.id) + '_tag_count', value=count, time=300)

    def reset_tag_processed(self):
        self.tag_processed = 0
        memcache.set(str(self.id) + '_tag_processed', value=0, time=300)

    def incr_tag_processed(self):
        self.tag_processed += 1
        memcache.incr(key=str(self.id) + '_tag_processed')

    def set_status(self, status):
        memcache.set(key=str(self.id) + '_status', value=status)
        importer_status = Importer.get_by_id(self.id)
        importer_status.importer_status = status
        importer_status.put()

    def set_resaon(self, reason):
        memcache.set(key=str(self.id) + '_reason', value=reason)
        importer_status = Importer.get_by_id(self.id)
        importer_status.importer_reason = reason
        importer_status.put()

    def quit(self, tag):
        return False


class HTMLImporter(ImporterTask):

    def handle_html(self, soup):
        self.tags = soup.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'title', 'ul', 'ol', 'img'], recursive=True)
        parent_index = 0
        parent = [None, None, None, None, None, None, None]
        self.set_tag_count(len(self.tags))
        self.reset_tag_processed()

        processed_p_tag = False
        processed_tag = False

        self.tag_index = -1
        for tag in self.tags:
            if self.quit(tag):
                break
            self.tag_index += 1
            if tag.name == 'p':
                processed_p_tag = True
                processed_tag = True
                self.import_html_paragraph(tag, parent=parent[parent_index])

            elif tag.name == 'h1':
                processed_tag = True
                attribute = self.create_new_attribute('h')
                concept = self.create_new_concept(self.get_strings(tag), parent=None, attribute=attribute)
                parent_index = 1
                parent[1] = concept

            elif tag.name == 'h2':
                processed_tag = True
                attribute = self.create_new_attribute('h')
                concept = self.create_new_concept(self.get_strings(tag), parent=parent[1], attribute=attribute)
                parent_index = 2
                parent[2] = concept

            elif tag.name == 'h3':
                processed_tag = True
                attribute = self.create_new_attribute('h')
                concept = self.create_new_concept(self.get_strings(tag), parent=parent[2], attribute=attribute)
                parent_index = 3
                parent[3] = concept

            elif tag.name == 'h4':
                processed_tag = True
                attribute = self.create_new_attribute('h')
                concept = self.create_new_concept(self.get_strings(tag), parent=parent[3], attribute=attribute)
                parent_index = 4
                parent[4] = concept

            elif tag.name == 'h5':
                processed_tag = True
                attribute = self.create_new_attribute('h')
                concept = self.create_new_concept(self.get_strings(tag), parent=parent[4], attribute=attribute)
                parent_index = 5
                parent[5] = concept

            elif tag.name == 'h6':
                processed_tag = True
                attribute = self.create_new_attribute('h')
                concept = self.create_new_concept(self.get_strings(tag), parent=parent[5], attribute=attribute)
                parent_index = 6
                parent[6] = concept

            elif tag.name == 'ul' or tag.name == 'ol':
                if processed_p_tag:
                    processed_tag = True
                    self.process_list(tag, parent=self.last_concept)

            elif tag.name == 'img' and processed_tag:
                more_non_img_tags = False
                for i in xrange(self.tag_index + 1, len(self.tags)):
                    if self.tags[i].name != 'img':
                        more_non_img_tags = True
                if more_non_img_tags:
                    processed_tag = True
                    attribute = self.create_new_attribute('img')
                    concept = self.create_new_concept('', parent=parent[parent_index], attribute=attribute)
                    self.image_tags.append({'img': tag, 'concept': concept})

            self.incr_tag_processed()
            if len(self.concept_array.keys()) >= 199:
                ndb.put_multi(self.concept_array.values())
                ndb.put_multi(self.attribute_array.values())
                ndb.put_multi(self.crawlcontext_array)
                ndb.put_multi(self.phrasing_array)
                ndb.put_multi(self.prems_array)
                self.index_phrasings(self.phrasing_array)
                self.concept_array = {}
                self.attribute_array = {}
                self.crawlcontext_array = []
                self.phrasing_array = []
                self.prems_array = []
                for con in parent:
                    if con is not None:
                        self.concept_array[con.key.id()] = con

            if not self.p_tags_left():
                break

        ndb.put_multi(self.concept_array.values())
        ndb.put_multi(self.attribute_array.values())
        ndb.put_multi(self.crawlcontext_array)
        ndb.put_multi(self.phrasing_array)
        self.index_phrasings(self.phrasing_array)
        ndb.put_multi(self.prems_array)
        self.project.put()
        memcache.add(key=str(self.id) + '_result', value=self.project.key.id())
        self.set_status('finished')
        self.import_images()

    def import_website(self, url, title=None, analytic_session=None):
        self.set_status('running')

        self.sent_tok = nltk.data.load('lib/nltk_data/tokenizers/punkt/english.pickle')
        if not url:
            filename = '/' + server.GCS_BUCKET_NAME + '/importerdata/' + self.id
            f = gcs.open(filename, mode='r')
            html_text = f.read()
            f.close()
            gcs.delete(filename)
        else:
            try:
                html_text = self.get_url_html(url)
            except:
                self.set_status('failed')
                self.set_resaon('Invalid URL')
                raise

        try:
            soup = BeautifulSoup(html_text)
        except:
            self.set_status('failed')
            self.set_resaon('Could not parse html')
            raise

        if not title:
            title = soup.title.string if soup.title else 'Untitled Project'
        self.create_new_project(title)
        if url:
            self.project.import_url = url
            self.project.record_analytic('pro_import', analytic_session, meta_data={
                'url': url,
                'domain': '{uri.netloc}'.format(uri=urlparse(url))}
            )
        soup = HTMLImporter.remove_common_comments_sections(soup)
        try:
            self.handle_html(soup)
        except:
            self.set_status('failed')
            self.set_resaon('unknowen')
            raise

    def import_html_paragraph(self, paragraph, parent=None):
        last_concept = None
        last_attribute = None
        sentence_list = self.split_paragraph_into_sentences(self.get_strings(paragraph))
        if len(sentence_list) > 0:
            last_concept = parent_concept = self.create_new_concept(sentence_list[0], parent)
            index = 0
            for sent in sentence_list[1:]:
                last_concept = self.create_new_concept(sent, parent_concept)
                index += 1

        if last_concept:
            return last_concept, last_attribute
        else:
            return None, None

    @staticmethod
    def get_strings(sentence):
        string = ''
        for stri in sentence.strings:
            string += stri
        return string

    @staticmethod
    def get_url_html(url):
        website = urlfetch.fetch(url)
        html_text = website.content
        return html_text

    @staticmethod
    def remove_common_comments_sections(soup):
        comment_class_list = ['disqus_thread']
        for c in comment_class_list:
            if soup.find(id=c) is not None:
                soup.find(id=c).decompose()

        return soup

    @staticmethod
    def normalize_image_url(base_url, image_src):
        if image_src.startswith('http://') or image_src.startswith('https://'):
            return image_src

        if image_src.startswith('//'):
            return 'http:' + str(image_src)

        new_url = base_url if base_url[-1] != '/' else base_url[:-1]

        while new_url.count('/') > 2:
            new_url = new_url[:new_url.rfind('/')]

        mod_img_src = image_src if image_src[0] == '/' else '/' + image_src

        log.info(new_url + mod_img_src)
        return new_url + mod_img_src

    def import_images(self):
        concepts = []
        deleted_concept = []
        image_concept = []
        for img_tag in self.image_tags:
            try:
                tag = img_tag['img']
                src = HTMLImporter.normalize_image_url(self.url, tag['src'])
                alt = tag.get('alt', None)
                concept = img_tag['concept']
                r = requests.get(src, stream=True)
                concept.media_id = server.create_uuid()
                filename = '/' + server.GCS_BUCKET_NAME + '/' + concept.media_id
                image_data = StringIO(r.content).getvalue()
                image = images.Image(image_data=image_data)
                if 'image' not in r.headers['content-type']:
                    deleted_concept.append({'concept': concept.key.id(),
                                            'parent_child_count': concept.parent.get().num_of_children(
                                                self.user) if concept.parent else None,
                                            'parent': concept.parent.id() if concept.parent else None})
                    concept.remove_from_parent(concept.project)
                    concept.delete(self.user)
                    continue
                if image.width < 100 or image.height < 100:
                    deleted_concept.append({'concept': concept.key.id(),
                                            'parent_child_count': concept.parent.get().num_of_children(
                                                self.user) if concept.parent else None,
                                            'parent': concept.parent.id() if concept.parent else None})
                    concept.remove_from_parent(concept.project)
                    concept.delete(self.user)
                else:
                    f = gcs.open(filename, mode='w', content_type=r.headers['content-type'])
                    f.write(image_data)
                    f.close()
                    concept.media_blob = blobstore.create_gs_key('/gs' + filename)
                    concept.media_ready = True
                    concept.media_mime_type = r.headers['content-type']
                    if alt and alt.rstrip() != '':
                        phr_perm = Permission(permissions=Permission.init_perm_struct(Phrasing.operations_list),
                                              key=Permission.create_key(), project=self.project.key)
                        phrasing = Phrasing(key=Phrasing.create_key(), text=alt, concept=concept.key,
                                            owner=[self.user.key], permissions=phr_perm.key,
                                            originating_document=self.document.key, project=self.project.key)
                        phr_perm.artifact = phrasing.key
                        ndb.put_multi([phrasing, phr_perm])
                        concept.phrasings.append(phrasing.key)
                        concept.distilled_phrasing = phrasing.key
                    image_concept.append(concept.key.id())
                    concepts.append(concept)
                    concept.put()
            except Exception as e:
                # raise
                type_, value_, traceback_ = sys.exc_info()
                ex = traceback.format_exception(type_, value_, traceback_)
                lr = tt_logging.construct_log(msg_short='Error Importing Image',
                                              msg=e.message + '\n\n' + str(ex),
                                              log_type=tt_logging.USER, artifact=self.project,
                                              request_user=self.user)
                log.error(lr['dict_msg']['msg'], extra=lr)


class Wikipediaimporter(HTMLImporter):
    def import_website(self, url, title=None, analytic_session=None):
        self.set_status('running')

        self.sent_tok = nltk.data.load('lib/nltk_data/tokenizers/punkt/english.pickle')
        try:
            html_text = self.get_url_html(url)
        except:
            self.set_status('failed')
            self.set_resaon('could not fetch data from url')
            raise

        try:
            soup = BeautifulSoup(html_text)
        except:
            self.set_status('failed')
            self.set_resaon('could not parse html')
            raise

        self.create_new_project(soup.title.string)
        if url:
            self.project.import_url = url
            self.project.record_analytic('pro_import', analytic_session, meta_data={
                'url': url,
                'domain': '{uri.netloc}'.format(uri=urlparse(url))}
            )
        soup = Wikipediaimporter.remove_uneeded_wiki_senction(soup)

        try:
            self.handle_html(soup)
        except:
            self.set_status('failed')
            self.set_resaon('unknowen')
            raise

    @staticmethod
    def remove_uneeded_wiki_senction(soup):
        # comment_class_list = ['toc', 'mw-panel', 'mw-head', 'mw-navigation',
        #                       'See_also', 'Further_reading', 'References',
        #                       'External_links']
        comment_class_list = ['toc', 'mw-panel', 'mw-head', 'mw-navigation',
                              'Further_reading', 'References','External_links']
        for c in comment_class_list:
            element = soup.find(id=c)
            if element is not None:
                element.decompose()

        elements = soup.find_all('noscript')
        for element in elements:
            if element:
                element.decompose()

        element = soup.find('table', {'class': 'infobox'})
        if element is not None:
            element.decompose()

        element = soup.find('table', {'class': 'metadata'})
        if element is not None:
            element.decompose()

        elements = soup.find_all('table', {'class': 'navbox'})
        for element in elements:
            if element is not None:
                element.decompose()

        element = soup.find('div', {'class': 'topicon'})
        if element is not None:
            element.decompose()

        element = soup.find('div', {'class': 'portal'})
        if element is not None:
            element.decompose()

        element = soup.find('div', {'class': 'reflist'})
        if element is not None:
            element.decompose()

        element = soup.find('div', {'class': 'magnify'})
        if element is not None:
            element.decompose()

        element = soup.find('div', {'id': 'footer'})
        if element is not None:
            element.decompose()

        edit_spans = soup.findAll('span', {'class': 'mw-editsection'})
        for es in edit_spans:
            es.extract()

        ref = soup.findAll('sup', {'class': 'reference'})
        for r in ref:
            r.extract()

        return soup

    def quit(self, tag):
        for child in tag.contents:
            if type(child) == bs4.element.Tag and child.has_attr('id') and child['id'] == 'See_also':
                return True
        return False


class TextImporter(ImporterTask):
    def import_text(self, text, title):
        self.sent_tok = nltk.data.load('lib/nltk_data/tokenizers/punkt/english.pickle')
        if not text:
            filename = '/' + server.GCS_BUCKET_NAME + '/importerdata/' + self.id
            f = gcs.open(filename, mode='r')
            text = f.read()
            f.close()
            gcs.delete(filename)
        self.create_new_project(title)
        index = 0
        paragraphs = text.split('\n')
        self.set_tag_count(len(paragraphs))
        self.reset_tag_processed()

        self.set_status('running')

        for par in paragraphs:
            self.import_text_paragraph(par, parent=None)
            index += 1
            self.incr_tag_processed()

        ndb.put_multi(self.concept_array.values())
        ndb.put_multi(self.attribute_array.values())
        ndb.put_multi(self.crawlcontext_array)
        ndb.put_multi(self.phrasing_array)
        ndb.put_multi(self.prems_array)
        self.index_phrasings(self.phrasing_array)
        self.project.put()
        memcache.add(key=str(self.id) + '_result', value=self.project.key.id())
        self.set_status('finished')

    def import_text_paragraph(self, paragraph, parent=None):
        sentence_list = self.split_paragraph_into_sentences(paragraph)
        if len(sentence_list) == 0:
            return
        parent_concept = self.create_new_concept(sentence_list[0], parent)
        index = 0
        for sent in sentence_list[1:]:
            sent = sent.strip()
            if len(sent) > 0:
                self.create_new_concept(sent, parent_concept)
                index += 1
        return parent_concept
