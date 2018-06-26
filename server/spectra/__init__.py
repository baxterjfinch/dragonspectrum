import actions


class InvalidActionException(Exception):
    pass


def calculate_cost(action, user=None, artifact=None):
    cost = actions.action_costs.get(action)
    if cost is None:
        raise InvalidActionException('%s is not a valid action type' % action)
    return cost


def has_sufficient_points(cost, user):
    return user.get_spectra_count() - cost >= 0
