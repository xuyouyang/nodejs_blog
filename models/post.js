/**
 * Created by xu on 14-9-27.
 */
var mongodb = require('./db');
var markdown = require('markdown').markdown;

function Post(name, title, tags, post) {
    this.name = name;
    this.title = title;
    this.tags = tags;
    this.post = post;
}

module.exports = Post;

// 存储一篇文章及其相关信息
Post.prototype.save = function(callback) {
    var date = new Date();
    //存储各种时间格式，方便以后扩展
    var time = {
        date: date,
        year: date.getFullYear(),
        month: date.getFullYear() + "-" + (date.getMonth() +1),
        day: date.getFullYear() + "-" + (date.getMonth() +1) + "-" + date.getDate(),
        minute : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +
            date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
    };
    //要存入数据库的文档
    var post = {
        name: this.name,
        time: time,
        title: this.title,
        tags: this.tags,
        post: this.post,
        comments:[]
    };
    //打开数据库
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        //读取post集合
        db.collection('posts', function(err, collection){
            if(err){
                mongodb.close();
                return callback(err);
            }
            //将文档插入posts集合
            collection.insert(post, {
                safe: true
            }, function (err) {
                mongodb.close();
                if(err) {
                    return callback(err);
                }
                callback(null);
            });
        });
    });
};

//读取文章及其相关信息，每页显示10篇
Post.getTen = function (name, page, callback) {
    //打开数据库
    mongodb.open(function (err, db) {
        if(err){
            return callback(err);
        }
        //读取posts集合
        db.collection('posts', function (err, collection) {
            if(err){
                mongodb.close();
                return callback(err);
            }
            var query = {};
            if (name) {
                query.name = name;
            }
            //使用count返回特定查询的文档数total
            collection.count(query, function(err, total){
                //根据query对象插叙，并跳过前（page - 1）*10个结果，返回之后的10个结果
                collection.find(query, {
                    skip: (page - 1)*10,
                    limit: 10
                }).sort({
                    time: -1
                }).toArray(function(err, docs){
                    mongodb.close();
                    if(err){
                        return callback(err);
                    }
                    //解析markdown为html
                    docs.forEach(function (doc) {
                        doc.post = markdown.toHTML(doc.post);
                    });
                    return callback(null, docs, total);
                });
            });
        });
    });
};

//获取一篇文章
Post.getOne = function (name, day, title, callback) {
    //打开数据库
    mongodb.open (function (err, db) {
        if (err) {
            return callback(err);
        }
        //读取posts集合
        db.collection ('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            //根据用户名、发表日期、文章标题进行查询
            collection.findOne({
                "name": name,
                "time.day": day,
                "title": title
            }, function (err, doc) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                if(doc){
                    doc.post = markdown.toHTML(doc.post);
                    doc.comments.forEach(function (comment) {
                        comment.content = markdown.toHTML(comment.content);
                    });
                }
                return callback(null, doc);
            });
        });
    });
};

//返回原始发表的内容（markdown 格式）
Post.edit = function (name, day, title, callback) {
    // 打开数据库
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        //读取posts集合
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            //根据用户名、发表日期、文章名进行查询
            collection.findOne({
                "name": name,
                "time.day": day,
                "title": title
            }, function (err, doc) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                return callback(null, doc);
            });
        });
    });
};

//更新一篇文章
Post.update = function (name, day, title, post, callback) {
    //打开数据库
    mongodb.open(function (err, db) {
        if(err){
            return callback(err);
        }
        //读取collection
        db.collection('posts', function (err, collection) {
            if(err){
                mongodb.close();
                return callback(err);
            }
            collection.update({
                "name": name,
                "time.day": day,
                "title": title
            }, {
                $set:{post: post}
            }, function(err){
                mongodb.close();
                if(err){
                    return callback(err);
                }
                return callback(null);
            });
        });
    });
};

//删除一篇文章
Post.remove = function(name, day, title, callback){
    //打开数据库
    mongodb.open(function (err, db) {
        if(err){
            return callback(err);
        }
        //读取posts集合
        db.collection('posts', function (err, collection) {
            if(err){
                mongodb.close();
                return callback(err);
            }
            //根据用户名、日期和标题查找并删除一篇文章
            collection.remove({
                "name": name,
                "time.day": day,
                "title": title
            }, {
                w: 1
            }, function (err) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                return callback(null);
            });
        });
    });
};

Post.getArchive = function (callback) {
    //打开数据库
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        //读取posts集合
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            //返回值包含name，time，title属性的文档组成的存档数组
            collection.find({}, {
                "name": 1,
                "time": 1,
                "title": 1
            }).sort({
                time: -1
            }).toArray(function (err, docs) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null, docs);
            });
        });
    });
};

// 返回所有标签
Post.getTags = function (callback) {
    mongodb.open(function(err, db){
        if (err) {
            return callback(err);
        }
        db.collection('posts', function(err, collection){
            if (err) {
                db.close();
                return callback(err);
            }
            // distinct用来找出给定键的所有不同值
            collection.distinct('tags', function(err, docs){
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null, docs);
            });
        });
    });
};

//返回特定tag下的所有文章
Post.getTag = function (tag, callback) {
    mongodb.open(function(err, db){
        if (err) {
            return callback(err);
        }
        db.collection('posts', function(err, collection){
            if (err) {
                mongodb.close();
                return callback(err);
            }
            collection.find({
                "tags": tag
            }, {
                "name": 1,
                "time": 1,
                "title": 1
            }).sort({
                time: -1
            }).toArray(function (err, docs) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                return callback(null, docs);
            });
        });
    });
};