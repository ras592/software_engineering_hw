var chat = (function() {
	// connect to socket.io
	var socket = io();
	var current_user_name = '';
	var current_user_email = '';
	var users = [];
	var cur_conv = '';
	var convs = {};
	var $current_link = null;

	// cache DOM
	var $chat_form = $('.chat_form');
	var $messages = $('#messages');
	var $chat_input = $('input#chat_input');
	var $username = $('h3#title #username');
	var $email = $('h3#title #email');
	var $user_list = $('#user_list');
	var $message_links = $('a.message_link');
	var $censor_modal = $('#censorModal');
	var $admin_censor_modal = $('#adminCensorModal');
	var $link_button = $('.modal #link_button');
	var $censor_button = $('.modal #censor_button');
	var $safe_button = $('.modal #safe_button');

	// bind events
	$chat_form.submit(_sendMessage);
	$('#user_list').delegate('a.list-group-item', 'click', _changeConversation);
	$('#messages').delegate('a.message_link', 'click', _handleMessageLink);
	$link_button.click(_goToLink);
	$censor_button.click(_censorLink);
	$safe_button.click(_safeLink);
	socket.on('chat init_users', _initUsers);
	socket.on('chat set_admin', _setAdmin);
    socket.on('chat message', _receiveMessage);
	socket.on('chat link_message', _linkMessage);

    function _createUserListItem(username, email, online) {
    	if(online === true) {
	    	return [
	    		'<a href="#" class="list-group-item">',
	        		'<span class="username">' + username + '</span> ',
	        		'[<span class="email">' + email + '</span>]',
	      		'</a>'
	    	].join('');
	    } else {
	    	return [
	    		'<a href="#" class="list-group-item">',
	        		'<i><span class="username">' + username + '</span> ',
	        		'[<span class="email">' + email + '</span>] Offline</i>',
	      		'</a>'
	    	].join('');
	    }
	}

	function _initUsers(users_dict) {
		users_list = [];
		for (var user in users_dict) {
			if (user !== current_user_name + '|' + current_user_email) {
				users_list.push({
					username: users_dict[user].username,
					email: users_dict[user].email,
					online: users_dict[user].online
				});
			}
		}
		users = users_list;
		_updateUsersList();
	}

	function _setAdmin(admin) {
		if (admin.admin) {
			window.__admin = true;
		}
	}

	function _sortUsers() {
		users.sort(function(a, b) {
			if (a.username === undefined) {
				return 1;
			}
			if (b.username === undefined) {
				return -1;
			}
			var nameA = a.username.toUpperCase();
			var nameB = b.username.toUpperCase();
			if (a.online === true && b.online !== true) {
				return -1;
			}
			if (a.online !== true && b.online === true) {
				return 1;
			}
			if (nameA < nameB) {
				return 1;
			}
			if (nameA > nameB) {
				return -1;
			}

			return 0;
		});
	}

    function _updateUsersList() {
    	_sortUsers();
    	$user_list.html('');
    	users.forEach(function(user) {
    		$user_list.append(_createUserListItem(user.username, user.email, user.online));
    	});
    }

	function _setUsername(username) {
		current_user_name = $username.text();
        current_user_email = $email.text();
        socket.emit('chat user_selection', {
        	username: current_user_name,
        	email: current_user_email
        });
    }

    function _receiveMessage(msg) {
        _appendMessage(msg.username, msg.message);
        _messagesToBottom();
    }

	function _linkMessage(msg) {
		console.log('link message');
		console.log(msg);
		if(window.__admin !== undefined) {
			if (window.__admin) {
				// admin
				console.log('admin');
				$messages.append($('<li class="admin">').html(msg.username + ": " + msg.message));
			}
		} else {
			$messages.append($('<li>').html(msg.username + ": " + msg.message));
		}
	}

    function _sendMessage(msg) {
        msg.preventDefault();
        var message = $chat_input.val();
        if(current_user_name !== null && message.length !== 0) {
            _emitMessage(message);
            $chat_input.val('');
            return false;
        }
    }

    function _emitMessage(msg) {
        _appendMessage(current_user_name, msg)
        _messagesToBottom();
        socket.emit('chat message', msg);
    }

    function _appendMessage(user, msg, recreate) {
    	if (recreate === undefined) {
    		recreate = false;
    	}

    	$messages.append($('<li>').text(user + ": " + msg));

    	if (recreate === false) {
	    	if (convs[cur_conv] !== undefined) {
	    		convs[cur_conv].push({username: user, message: msg});
	    	} else {
	    		convs[cur_conv] = [{username: user, message: msg}]
	    	}
    	}
    }

    function _messagesToBottom() {
        $messages[0].scrollTop = $messages[0].scrollHeight;
    }

    function _setMessagesTitle() {
    	$conversation_with = $('#user_list .list-group-item.active');
    	$conversation_title = $('#conversation_title');
    	$conversation_title.text($conversation_with.text());
    }

    function _changeConversation(e) {
    	e.preventDefault();
    	$new_conv = $(this);
    	var new_conv_obj = null;
    	if ($new_conv.hasClass('active')) {
    		// do nothing
    		return;
    	} else {
    		$('#user_list a.active').removeClass('active');
    		var new_conv_obj = {
    			username: $new_conv.find('.username').text(),
    			email: $new_conv.find('.email').text()
    		};
    		_changeConversationTo(new_conv_obj);
    		$new_conv.addClass('active');
    		_setMessagesTitle()
    	}
    }

    function _redoMessages() {
    	$messages.html("");
    	if(convs[cur_conv] !== undefined) {
    		for(var i in convs[cur_conv]) {
    			_appendMessage(convs[cur_conv][i].username, convs[cur_conv][i].message, true);
    		}
    	}
    }

    function _changeConversationTo(new_conv_obj) {
    	if (current_user_email.toUpperCase() < new_conv_obj.email.toUpperCase()) {
    		cur_conv = current_user_email + '|' + new_conv_obj.email;
    	} else {
    		cur_conv = new_conv_obj.email + '|' + current_user_email;
    	}
    	socket.emit('chat select_room', cur_conv);
    	_redoMessages();
    	// clear messages, change room to new user
    }

	function _goToLink() {
		var href = $('#admin_modal_link_value').text();
		window.open(href, "_blank");
	}

	function _censorLink() {
		var href = $('#admin_modal_link_value').text();
		if ($current_link[0].href === href) {
			$current_link.addClass('handled');
		}
		socket.emit('chat add_to_censor', $current_link[0].href);
	}

	function _safeLink() {
		var href = $('#admin_modal_link_value').text();
		if($current_link[0].href === href) {
			$current_link.addClass('safe_link');
		}
		socket.emit('chat add_to_safe', $current_link[0].href);
	}

	function _handleMessageLink(e) {
		e.preventDefault();
		var $this = $(this);
		$current_link = $($this.closest('a.message_link')[0]);
		if (!($current_link.hasClass('handled') || $current_link.hasClass('safe_link'))) {
			var href = $this.closest('a.message_link')[0].href;
			$('#admin_modal_link_value').text(href);
			$('#modal_link_value').text(href);
			if($this.parent().hasClass('admin')) {
				$admin_censor_modal.modal('show');
			} else {
				$censor_modal.modal('show');
			}
		} else if ($current_link.hasClass('safe_link')) {
			window.open($current_link[0].href, "_blank");
		}
	}

	function init() {
		_setUsername();
		_setMessagesTitle();
	}

	return {
		init: init
	}

})();

chat.init();
