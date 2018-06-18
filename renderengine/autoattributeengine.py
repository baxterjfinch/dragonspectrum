from models.artifacts import attributes


def is_list_item(concept, doc, user=None):
    parent = concept.parent_obj
    attr = parent.get_attr_by_doc(doc)
    return (is_ordered_list(parent, attr, doc, user=user) or
            is_unordered_list(parent, attr, doc, user=user))


def is_ordered_list(concept, attr, doc, user=None):
    if not attr:
        attr = concept.get_attr_by_doc(doc)
    if attr and attr.is_no_list():
        return False
    if attr and attr.is_ordered_list():
        return True
    if attr and attr.is_unordered_list():
        return False
    if concept.is_root():
        return False
    parent = concept.parent_obj
    return (concept.is_parent() and
            is_list_item(concept, doc, user=user) and
            parent.render_object.render_as_ordered_list)


def is_unordered_list(concept, attr, doc, user=None):
    if not attr:
        attr = concept.get_attr_by_doc(doc)
    if attr and attr.is_no_list():
        return False
    if attr and attr.is_unordered_list():
        return True
    if attr and attr.is_ordered_list():
        return False
    if concept.is_root():
        return False
    parent = concept.parent_obj
    return (concept.is_parent() and
            is_list_item(concept, doc, user=user) and
            parent.render_object.render_as_unordered_list)


def is_header(concept, attr, doc, user=None):
    # TODO: account for linked concepts
    if not concept.is_parent(user=user):
        return False
    if attr and attr.is_no_header():
        return False
    children = concept.get_children(user=user)
    if len(children) == 0:
        return False
    if concept.get_phrasing(doc=doc, return_text=False).get_word_count() > 7:
        return False
    count = 0
    for child in children:
        if not child.is_parent(user=user):
            return False
        count += 1
    return count > 1


def is_paragraph(concept, user=None):
    parent = concept.parent_obj
    parent_render_object = parent.render_object
    if parent_render_object is None:
        print parent.is_root()
    if parent_render_object.is_rendered_list or concept.render_object.is_rendered_list:
        return False
    if concept.is_parent(user=user):
        return True
    children = parent.get_children(user=user)
    for child in children:
        if child and child == concept:
            break
        elif child and child.is_parent():
            return True
    return not parent_render_object.cur_attr == attributes.PARAGRAPH


def calculate_attribute(concept, attr, doc, user=None):
    if is_header(concept, attr, doc, user=user):
        return attributes.HEADER
    if is_paragraph(concept, user=user):
        return attributes.PARAGRAPH
    return attributes.NONE


def get_attr(concept, attr, doc, user=None):
    if attr and attr.is_header():
        return attributes.HEADER
    if attr and attr.is_paragraph():
        return attributes.PARAGRAPH
    if attr and attr.is_image():
        return attributes.IMAGE
    return calculate_attribute(concept, attr, doc, user=user)
