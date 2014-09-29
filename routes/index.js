
/*
 * GET home page.
 */

var crypto = require('crypto');
var fs = require('fs');
var User = require('../models/user.js');
var Post = require('../models/post.js');

module.exports = function(app){

    // Get - home
    app.get('/', function (req, res){
        Post.getAll(null, function (err, posts) {
            if (err) {
                posts = [];
            }
            res.render('index', {
                title: '主页',
                user: req.session.user,
                posts: posts,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });

    // Get - reg
    app.get('/reg', checkNotLogin);
    app.get('/reg', function (req, res){
        res.render('reg', {
            title: '注册',
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });

    // Post - reg
    app.post('/reg', checkNotLogin);
    app.post('/reg', function (req, res) {
        // 处理用户注册
        var name = req.body.name;
        var password = req.body.password;
        var password_re = req.body['password-repeat'];
        // 检验用户两次输入的密码是否一致
        if (password != password_re) {
            req.flash('error', '两次输入的密码不一致！');
            return res.redirect('/reg');//返回注册页
        }
        //生成密码的md5值
        var md5 = crypto.createHash('MD5');
        var password = md5.update(req.body.password).digest('hex');
        var newUser = new User({
            name: name,
            password: password,
            email: req.body.email
        });
        // 检查用户名是否已经存在
        User.get(newUser.name, function (err, user) {
            if (err) {
                req.flash('error', '用户已经存在！');
                return res.redirect('/reg');//返回注册页
            }
            //如果不存在则新增用户
            newUser.save(function(err, user) {
                if (err) {
                    req.flash('error', err);
                    return res.redirect('/reg');
                }
                req.session.user = user;//用户信息存入session
                req.flash('success', '注册成功！');
                res.redirect('/');
            });
        });
    });

    // Get - login
    app.get('/login',checkNotLogin);
    app.get('/login', function (req, res){
        res.render('login', {
            title: '登陆',
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });

    // Post - login
    app.post('/login', checkNotLogin);
    app.post('/login', function (req, res) {
        // 处理用户登陆
        // 生成密码的md5值
        var md5 = crypto.createHash('md5');
        var password = md5.update(req.body.password).digest('hex');
        // 检查用户是否存在
        User.get(req.body.name, function(err, user) {
            if (!user) {
                req.flash('error', '用户不存在');
                return res.redirect('/login');
            }
            // 坚持密码是否一致
            if (password != user.password) {
                req.flash ('error', '密码错误');
                return res.redirect('/login');
            }
            // 用户名密码都匹配后，将用户信息存入session
            req.session.user = user;
            req.flash('success', '登陆成功');
            res.redirect('/');
        });
    });

    // Get - post
    app.get('/post', checkLogin);
    app.get('/post', function (req, res){
        res.render('post', {
            title: '发表',
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });

    // Post - post
    app.post('/post', checkLogin);
    app.post('/post', function (req, res) {
        // 处理用户发表文章
        var currentUser = req.session.user;
        var post = new Post(currentUser.name, req.body.title, req.body.post);
        post.save(function(err){
            if(err){
                req.flash('error',err);
                return res.redirect('/');
            }
            req.flash('success', '发布成功');
            res.redirect('/');
        });
    });

    // Get - logout
    app.get('/logout', checkLogin);
    app.get('/logout', function (req, res){
        req.session.user = null;
        req.flash('success', '登出成功');
        res.redirect('/');
    });

    // Get- upload
    app.get('/upload', checkLogin);
    app.get('/upload', function (req, res) {
        res.render('upload', {
            title: '文件上传',
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });

    // Post - upload
    app.post('/upload', checkLogin);
    app.post('/upload', function (req, res) {
        for (var i in req.files) {
            if (req.files[i].size == 0) {
                //使用同步方式删除一个文件
                fs.unlinkSync(req.files[i].path);
                console.log('Successly removed an empty file!');
            } else {
                //使用同步方式重命名一个文件
                var taget_path = './public/images/' + req.files[i].name;
                fs.renameSync(req.files[i].path, taget_path);
                console.log('Successly rename a file!');
            }
        }
        req.flash('success', '文件上传成功');
        res.redirect('/upload');
    });

    // Get - /u/name
    app.get('/u/:name', function(req, res){
        console.log("name:" + req.params.name);
        //检查用户时候存在
        User.get(req.params.name, function (err, user) {
            if (!user) {
                req.flash('error', '该用户不存在');
                return res.redirect('/');
            }
            //查询并返回该用户的所有文章
            Post.getAll(req.params.name, function (err, posts) {
                if (err) {
                    req.flash('error', err);
                    return res.redirect('/');
                }
                res.render('user', {
                    title: user.name,
                    posts: posts,
                    user: req.session.user,
                    success: req.flash('success').toString(),
                    error: req.flash('error').toString()
                });
            });
        });
    });

    // Get - /u/name/day/title
    app.get('/u/:name/:day/:title', function (req, res) {
        Post.getOne(req.params.name, req.params.day, req.params.title, function (err, post) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('article', {
                title: req.params.title,
                post: post,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });

    // Get - /edit/name/day/title
    app.get('/edit/:name/:day/:title', checkLogin);
    app.get('/edit/:name/:day/:title', function (req, res) {
        var currentUser = req.session.user;
        Post.edit(currentUser.name, req.params.day, req.params.title, function (err, post) {
            if (err) {
                req.flash('error', err);
                res.redirect('back');
            }
            res.render('edit', {
                title: "编辑",
                post: post,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });

    // Post - /edit/name/day/title
    app.post('/edit/:name/:day/:title', checkLogin);
    app.post('/edit/:name/:day/:title', function (req, res) {
        var currentUser = req.session.user;
        Post.update(currentUser.name, req.params.day, req.params.title, req.body.post, function(err){
            var url = '/u/' + req.params.name + '/' + req.params.day + '/' + req.params.title;
            if(err){
                req.flash('error', err);
                res.redirect(url);
            }
            req.flash('success', "修改成功!");
            console.log(url);
            res.redirect(url);
        });
    });


    // 路由中间件，处理url权限
    function checkLogin(req, res, next) {
        if (!req.session.user) {
            req.flash('error', '未登陆');
            res.redirect('/login');
        }
        next();
    }

    function checkNotLogin (req, res, next) {
        if (req.session.user) {
            req.flash('error', '已登录');
            res.redirect('back');//返回之前的页面
        }
        next();
    }
};