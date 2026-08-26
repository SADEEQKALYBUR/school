function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  res.redirect('/auth/login');
}

function isTeacher(req, res, next) {
  if (req.session.user && req.session.user.role === 'teacher') {
    return next();
  }
  res.redirect('/auth/login');
}

function isParent(req, res, next) {
  if (req.session.user && req.session.user.role === 'parent') {
    return next();
  }
  res.redirect('/auth/login');
}

function isLoggedIn(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect('/auth/login');
}

module.exports = { isAdmin, isTeacher, isParent, isLoggedIn };