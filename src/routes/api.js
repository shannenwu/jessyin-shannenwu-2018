// dependencies
const express = require('express');
const connect = require('connect-ensure-login')

// models
const Post = require('../models/post');
const User = require('../models/user');
const Inked = require('../models/inked');
const ProfilePicture = require('../models/profilepicture');
const UserLikes = require('../models/userlikes');


const router = express.Router();

// api endpoints
router.get('/whoami', function (req, res) {
    if (req.isAuthenticated()) {
        res.send(req.user);
    } else {
        res.send({});
    }
});

router.get('/user', function (req, res) {
    User.findOne({
        _id: req.query._id
    }, function (err, user) {
        res.send(user);
    });
});

router.get('/posts', function (req, res) {
    Post.find({}, function (err, posts) {
        res.send(posts);
    });
});

//Posting posts: adds a post document to the data base. When posts, sends data out to create a new post 
router.post('/posts', connect.ensureLoggedIn(), function (req, res) {
    User.findOne({
        _id: req.user._id
    }, function (err, user) {
        const newPost = new Post({
            'creator_id': user._id,
            'creator_name': user.name,
            'content': req.body.content,
        });

        user.save();


        newPost.save(function (err, post) {
            if (err) console.log(err);
            const io = req.app.get('socketio');
            io.emit('post', {
                _id: post._id,
                creator_id: user._id,
                creator_name: user.name,
                content: req.body.content,
                date: Date.now(),
                likes: '0'
            });
        });
        res.send({});
    });
});

//gets all the inks
router.get('/inked', function (req, res) {
    Inked.find({}, function (err, posts) {
        res.send(posts);
    });
});

//posts an inked document
router.post('/inked', connect.ensureLoggedIn(), function (req, res) {
    User.findOne({
        _id: req.user._id
    }, function (err, user) {
        const newInked = new Inked({
            'creator_id': user._id,
            'creator_name': user.name,
            'image_url': req.body.image_url,
            'post_id': req.body.post_id
        });
        user.save();

        newInked.save(function (err, post) {
            if (err) console.log(err);
        });
        res.send({});
    });
});

//posts a profile picture document. Doesn't actually retrieve from here ever
router.post('/profilepicture', connect.ensureLoggedIn(), function (req, res) {
    User.findOne({
        _id: req.user._id
    }, function (err, user) {
        const newProfilePicture = new ProfilePicture({
            'image_url': req.body.image_url
        });
        user.set({
            profile_picture: req.body.image_url
        });
        user.save();

        newProfilePicture.save(function (err, post) {
            if (err) console.log(err);
            const io = req.app.get('socketio');
            io.emit("updateProPic", {
                image_url: req.body.image_url
            });
        });
        res.send({});
    });
});

//removes post
router.get('/post/:id/remove', connect.ensureLoggedIn(), function (req, res) {
    Post.findByIdAndRemove({
            _id: req.params.id
        },
        function (err, docs) {
            if (err) console.log(err);
            else console.log('delete success');
            UserLikes.find({
                post_id: req.params.id
            }, function (err, likePosts) {
                for (let i = 0; i < likePosts.length; i++) {
                    UserLikes.findByIdAndRemove({
                            _id: likePosts[i]._id
                        },
                        function (err, docs) {
                            if (err) console.log(err);
                            else console.log('delete success');
                        });
                }
            });
            const io = req.app.get('socketio');
            io.emit("deletePost", {
                post_id: req.params.id
            });
            res.send({});
        });
});

//remove ink
router.get('/ink/:id/remove', connect.ensureLoggedIn(), function (req, res) {
    Inked.findByIdAndRemove({
            _id: req.params.id
        },
        function (err, docs) {
            if (err) console.log(err);
            else console.log('delete success');
            const io = req.app.get('socketio');
            io.emit("deleteInk", {
                inked_id: req.params.id
            });
            res.send({});
        });
});

//gets likes
router.get('/likes', function (req, res) {
    UserLikes.find({}, function (err, posts) {
        res.send(posts);
    });
});



router.get('/post/:id/like', connect.ensureLoggedIn(), function (req, res) {
    UserLikes.find({
        user_id: req.user._id,
        post_id: req.params.id
    }, function (err, posts) {
        if (posts.length == 0) {
            Post.findOne({
                _id: req.params.id
            }, function (err, post) {
                var count = ~~post.likes + 1;
                post.set({
                    likes: count
                });
                post.save();
                const newUserLike = new UserLikes({
                    user_id: req.user._id,
                    post_id: req.params.id
                });

                newUserLike.save(function (err, userlike) {
                    const io = req.app.get('socketio');
                    io.emit("updateLike", {
                        post_id: req.params.id,
                        likes: count
                    });
                    if (err) console.log(err);
                });
            });

        } else if (posts.length == 1) {
            likepost = posts[0];
            Post.findOne({
                _id: likepost.post_id
            }, function (err, post) {
                var count = ~~post.likes - 1;
                post.set({
                    likes: count
                });
                post.save();

                UserLikes.findByIdAndRemove({
                        _id: likepost._id
                    },
                    function (err, docs) {
                        if (err) console.log(err);
                        else console.log('delete success');
                    });
                const io = req.app.get('socketio');
                io.emit("updateLike", {
                    post_id: req.params.id,
                    likes: count,
                    user_id: likepost.user_id
                });

            })
        }
        res.send({});
    });
});




module.exports = router;
