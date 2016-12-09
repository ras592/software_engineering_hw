var censor = (function(){
    var $censor_list = $('#censor_list');
    var $censor_list_body = $('#censor_list_body');

    $censor_list_body.delegate('a.delete_link', 'click', _deleteCensorLink);

    function _toRow(item) {
        return [
            '<tr>',
            '<td>' + item.domain + '</td>',
            '<td>' + item.safe + '</td>',
            '<td><a class="delete_link" href="/censor_api" data-value="' + item._id + '">Delete</a></td></tr>',
        ].join('');
    }

    function _appendItem(item) {
        $censor_list_body.append(_toRow(item));
    }

    function _requestList() {
        $censor_list_body.html('');
        $.getJSON("/censor_api", function(data) {
            if(data.error === undefined) {
                for(var idx in data) {
                    _appendItem(data[idx]);
                }
            } else {
                console.log('Error fetching list.');
            }
        });
    }

    function _deleteCensorLink(e) {
        e.preventDefault();
        $this = $(this);
        var url = "/censor_api",
            args = {'_id': $this.attr('data-value')},
            callback = function (data) {
                if(data.error === undefined) {
                    if (data.error === 'true') {
                        console.log('error');
                    } else {
                        // success
                    }
                }
                _requestList();
            };
        $.post(url, args, callback);
    }

    function init() {
        _requestList();
    }

    return {
        init: init
    }
})();

censor.init();
