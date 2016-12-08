var users = {}; // users connected to the chat
var rooms = []; // rooms connected to the chat
var chat_data = {};
var db = null;

function _retrieveUsers(db) {
    var collection = db.collection('users');
    collection.find({}, {'username': 1, 'email': 1, '_id': 0}, function(error, cursor) {
        if (error) {
            console.log(error);
        } else {
            cursor.forEach(function(user) {
                add_bool = true;
                for(var user_key in users) {
                    if(user_key === user.username + '|' + user.email) {
                        add_bool = false;
                    }
                }
                if (add_bool) {
                    users[user.username + '|' + user.email] = {
                        username: user.username,
                        email: user.email,
                        online: false
                    }
                }
            });
        }
    });
}

exports.init = function(db_conn) {
    db = db_conn;
    _retrieveUsers(db);
}

exports.render = function(req, res) {
    ret_obj = {import_chat_js: true};

    ret_obj.title = 'Software Engineering Project';

    res.render('chat', {
        ret_obj: ret_obj,
        username: req.session.username,
        email: req.session.email
    });
};

exports.sockets = function(io, socket) {
    console.log('A user has connected!');

    // send current users
    io.emit('chat init_users', users);

    socket.on('chat user_selection', function(user) {
        if (users[getUsernameKey(user)] === undefined) {
            users[getUsernameKey(user)] = {
                username: user.username,
                email: user.email,
                online: true
            };
        } else {
            users[getUsernameKey(user)].online = true;
        }
        io.emit('chat init_users', users);
        socket.username = getUsernameKey(user)
        setAdmin(user.email, io);
    });

    socket.on('disconnect', function() {
        if (socket.username !== undefined) {
            if (users[socket.username] !== undefined) {
                if (users[socket.username].online !== undefined) {
                    users[socket.username].online = false;
                }
            }
            console.log('A user has disconnected! User: ' + socket.username);
        }
        io.emit('chat init_users', users);
    });

    socket.on('chat message', function(msg) {
        // if (rooms.indexOf(socket.room) > 0) {
        //     socket.room
        // }
        var link_tup = checkURLs(msg);
        if(link_tup[0]) {
            checkCensorList(link_tup[1], socket, msg);
        } else {
            socket.broadcast.to(socket.room).emit('chat message', {
                username: users[socket.username].username,
                message: msg
            });
        }
    });

    socket.on('chat select_room', function(room) {
        if(rooms.indexOf(room) < 0) {
            rooms.push(room);
        }
        socket.join(room);
        socket.room = room;
    });

    socket.on('chat add_to_censor', function(link_href) {
        insertCensorList(link_href, false);
    });

    socket.on('chat add_to_safe', function(link_href) {
        insertCensorList(link_href, true);
    });
};

function getUsernameKey(user_obj) {
    return user_obj.username + '|' + user_obj.email;
}

function sendLinkMessage(socket, msg) {
    socket.broadcast.to(socket.room).emit('chat link_message', {
        username: users[socket.username].username,
        message: msg
    });
}

function insertCensorList(link_href, safe) {
    var domain_name = toURL(link_href).host_name;
    var collection = db.collection('censorlist');

    collection.insert({'domain': domain_name, 'safe': safe}, function(error, result){
        if(error) {
            console.log(error);
        }
    });
}

function checkCensorList(link_obj, socket, msg) {
    var collection = db.collection('censorlist');

    collection.findOne({'domain': link_obj.host_name}, function(error, link) {
        if (error) {
            console.log(error);
            // not on list or error send without safe
            sendLinkMessage(socket, linkConverter(msg));
        } else if (link) {
            if (link.safe !== undefined) {
                if (link.safe) {
                    // safe link
                    sendLinkMessage(socket, safeLinkConverter(msg));
                } else {
                    // not safe send plain text
                    socket.broadcast.to(socket.room).emit('chat message', {
                        username: users[socket.username].username,
                        message: msg
                    });
                }
            } else {
                // not on list send without safe
                sendLinkMessage(socket, linkConverter(msg));
            }
        } else {
            // not on list send without safe
            sendLinkMessage(socket, linkConverter(msg));
        };
    });
}


function toURL(str) {
    var top_level_domains = ['.com', '.org', '.edu', '.gov', '.uk', '.net', '.ca', '.mil', '.info', '.ru', '.io'];
    var protocol = 'http://';
    var remainder = str;
    var host_name = '';
    var path = '';
    var add_protocol_bool = true;

    // protocol
    if (str.indexOf('http://') !== -1) {
        protocol = str.substring(0, 'http://'.length);
        remainder = str.substring('http://'.length);
        add_protocol_bool = false;
    } else if(str.indexOf('https://') !== -1) {
        protocol = str.substring(0, 'https://'.length);
        remainder = str.substring('http://'.length);
        add_protocol_bool = false;
    }

    // top level domain / host name split
    for(var top_level_idx in top_level_domains) {
        var idx = remainder.indexOf(top_level_domains[top_level_idx]);
        if(idx !== -1) {
            var host_name_idx = idx + top_level_domains[top_level_idx].length;
            host_name = remainder.substring(0, host_name_idx);
            path = remainder.substring(host_name_idx);
            var url = str;
            if(add_protocol_bool) {
                url = protocol + str;
            }
            return {
                protocol: protocol,
                host_name: host_name,
                url: url,
                path: path
            }
        }
    }
    return null;
}

function checkURLs(msg) {
    str_array = msg.split(' ');
    for (var idx in str_array) {
        var link_ret = toURL(str_array[idx]);
        if (link_ret) {
            return [true, link_ret];
        }
    }
    return [false, link_ret];
}

function linkConverter(msg) {
    str_array = msg.split(' ');
    var new_str_array = [];
    for (var idx in str_array) {
        var str = str_array[idx];
        var url = toURL(str);
        if (url) {
            new_str_array.push('<a class="message_link" href="' + url.url + '">' + url.url + '</a>');
        } else {
            new_str_array.push(str);
        }
    }
    return new_str_array.join(' ');
}

function safeLinkConverter(msg) {
    str_array = msg.split(' ');
    var new_str_array = [];
    for (var idx in str_array) {
        var str = str_array[idx];
        var url = toURL(str);
        if (url) {
            new_str_array.push('<a class="safe_link message_link" href="' + url.url + '">' + url.url + '</a>');
        } else {
            new_str_array.push(str);
        }
    }
    return new_str_array.join(' ');
}

function setAdmin(email, io) {
    var collection = db.collection('users');

    collection.findOne({'email': email}, function(error, user) {
        if (error) {
            console.log(error);
        } else if (user) {
            if(user.admin !== undefined) {
                if(user.admin) {
                    // admin
                    io.emit('chat set_admin', {admin: true});
                } else {} // not admin
            } else {} // not admin
        } else {} // not admin
    });
}
