import logging
from google.appengine.api import search, memcache

log = logging.getLogger(__file__)


ATOMFIELD = 1
TEXTFIELD = 2
HTMLFIELD = 3
NUMBERFIELD = 4
DATEFIELD = 5
GEOPOINTFIELD = 6


def get_indexes(namespace=None, index_name=None, create_new=True):
    if not namespace:
        return None
    if index_name is None:
        results = search.get_indexes(namespace=namespace).results
        if len(results) == 0 and create_new:
            return [search.Index('0001', namespace=namespace)]
        else:
            return results
    else:
        results = search.get_indexes(index_name_prefix=index_name, namespace=namespace).results
        if len(results) == 0 and create_new:
            return [search.Index(index_name + '_0001', namespace=namespace)]
        else:
            return results


def get_put_index(namespace=None, index_name=None):
    if not namespace:
        return None
    indexes = get_indexes(namespace=namespace, index_name=index_name)
    index = 0
    while True:
        if hasattr(indexes[index], 'storage_usage') and hasattr(indexes[index], 'storage_limit'):
            if indexes[index].storage_usage is not None and indexes[index].storage_limit is not None:
                if float(indexes[index].storage_usage) / float(indexes[index].storage_limit) > 0.98:
                    index += 1
                    if index == len(indexes):
                        if index_name is None:
                            return search.Index(str(index).zfill(4), namespace=namespace)
                        else:
                            return search.Index(index_name + str(index).zfill(4), namespace=namespace)
                    continue
        return indexes[index]


def index_artifact(index_, id_, fields):
    f = []
    for i in xrange(0, len(fields), 3):
        if fields[i] == ATOMFIELD:
            f.append(search.AtomField(name=fields[i+1], value=fields[i+2]))
        elif fields[i] == TEXTFIELD:
            f.append(search.TextField(name=fields[i+1], value=fields[i+2]))
        elif fields[i] == HTMLFIELD:
            f.append(search.HtmlField(name=fields[i+1], value=fields[i+2]))
        elif fields[i] == NUMBERFIELD:
            f.append(search.NumberField(name=fields[i+1], value=fields[i+2]))
        elif fields[i] == DATEFIELD:
            f.append(search.DateField(name=fields[i+1], value=fields[i+2]))
        elif fields[i] == GEOPOINTFIELD:
            f.append(search.GeoField(name=fields[i+1], value=fields[i+2]))
    doc = search.Document(doc_id=id_, fields=f)

    retry_count = 0
    while True:
        try:
            index_.put(doc)
            break
        except search.Error as e:
            if retry_count < 3:
                log.warning('Error put doc into index, could be out of space. Creating new index')
                index_ = search.Index(index_.name[:-4] + str(int(index_.name[-4:])).zfill(4),
                                      namespace=index_.namespace)
                retry_count += 1
            else:
                raise e


def index_multi_artifact(index_, ids_, fields_multi):
    docs = []
    for id_, fields in zip(ids_, fields_multi):
        f = []
        for i in xrange(0, len(fields), 3):
            if fields[i] == ATOMFIELD:
                f.append(search.AtomField(name=fields[i+1], value=fields[i+2]))
            elif fields[i] == TEXTFIELD:
                f.append(search.TextField(name=fields[i+1], value=fields[i+2]))
            elif fields[i] == HTMLFIELD:
                f.append(search.HtmlField(name=fields[i+1], value=fields[i+2]))
            elif fields[i] == NUMBERFIELD:
                f.append(search.NumberField(name=fields[i+1], value=fields[i+2]))
            elif fields[i] == DATEFIELD:
                f.append(search.DateField(name=fields[i+1], value=fields[i+2]))
            elif fields[i] == GEOPOINTFIELD:
                f.append(search.GeoField(name=fields[i+1], value=fields[i+2]))
        docs.append(search.Document(doc_id=id_, fields=f))

    retry_count = 0
    while True:
        try:
            index_.put(docs)
            break
        except search.Error as e:
            if retry_count < 3:
                log.warning('Error put doc into index, could be out of space. Creating new index')
                index_ = search.Index(index_.name[:-4] + str(int(index_.name[-4:])).zfill(4),
                                      namespace=index_.namespace)
                retry_count += 1
            else:
                raise e


def index_delete(indexes_, ids):
    for index in indexes_:
        index.delete(ids)


def get_result_type(result):
    fields = result.fields
    for field in fields:
        if field.name == 'typ':
            return field.value


def get_result_field_dict(result):
    fields = result.fields
    field_dict = {}
    for field in fields:
        field_dict[field.name] = field.value
    return field_dict


def get_cached_index_cursor(index, user):
    if user.organization:
        namespace = user.organization.id()
    else:
        namespace = 'user'
    key = index.name + '_' + user.key.id()
    return memcache.get(key, namespace=namespace)


def cache_index_cursor(index, user, cursor):
    if user.organization:
        namespace = user.organization.id()
    else:
        namespace = 'user'
    key = index.name + '_' + user.key.id()
    memcache.set(key, value=cursor, namespace=namespace)


def ttsearch(indexes, query_dict, limit=20, cache_cursor=True, use_cursor=True, user=None, ids_only=False):
    query = []
    if 'all' in query_dict:
        query = query_dict['all']
    else:
        if isinstance(query_dict, basestring):
            query = query_dict
        else:
            for key in query_dict.keys():
                query.append('%s: %s' % (key, query_dict.get(key)))
            query = ' '.join(query)
    try:
        results = []
        for index in indexes:
            if use_cursor:
                if not user:
                    raise Exception('must supply user for cursor')
                cursor = get_cached_index_cursor(index, user)
                if not cursor and use_cursor:
                    cursor = search.Cursor()
                elif cursor == 'done':
                    return None
                query_options = search.QueryOptions(limit=limit, cursor=cursor)
            else:
                query_options = search.QueryOptions(limit=limit)
            query = search.Query(query_string=query, options=query_options)
            resutls_obj = index.search(query)
            if cache_cursor:
                if not user:
                    raise Exception('must supply user for cursor')
                if resutls_obj.cursor:
                    cache_index_cursor(index, user, resutls_obj.cursor)
                else:
                    cache_index_cursor(index, user, 'done')
            results += resutls_obj.results
        result_ids = []
        if ids_only:
            for result in results:
                result_ids.append(result.doc_id)
            return result_ids
        else:
            for result in results:
                result_ids.append({'fields': get_result_field_dict(result), 'id': result.doc_id})
            return result_ids
    except search.Error as e:
        raise e


def clear_index(index):
    docs = index.get_range(limit=search.MAXIMUM_DOCUMENTS_PER_PUT_REQUEST, ids_only=True).results
    ids = []
    for doc in docs:
        ids.append(doc.doc_id)
    while len(ids) > 0:
        index.delete(ids)
        docs = index.get_range(limit=search.MAXIMUM_DOCUMENTS_PER_PUT_REQUEST, ids_only=True).results
        ids = []
        for doc in docs:
            ids.append(doc.doc_id)