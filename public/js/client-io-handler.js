var sv = "http://srpaochat.herokuapp.com/";

var socket = io(sv), //Creo el socket
    configs = { //Creo una variable para guardar configuraciones
        name: "Anonimo",
        show_sv_notif: true,
        show_cnx_notif: true,
        name_color: "#333",
        bg_img: null,
        owner: false
    },
    msg = $('#msg_input'), //Defino la variable del msg input
    chat = $('#chat'),
    cm_name = $('#c_name'),
    cm_svnot = $('#c_sv_notif'),
    cm_svcnx = $('#c_cnx_notif'),
    prv_id = $('#prv_id'),
    prv_dismiss = $('#prv_dismiss'),
    alert_modal = $('#alertModal'),
    alert_error = $('#alertError'),
    photo_available = $('#photo_available'),
    photo_unavailable = $('#photo_unavailable');

function emitir() { //Emito los mensajes nuevos
    if (msg.val().length < 1) return;

    var s_prv_id = prv_id.val().length > 1 ? prv_id.val() : null;

    if (s_prv_id) {
        socket.emit('prvt message', {
            msg: msg.val(),
            to: s_prv_id,
        });
    } else {
        var msj = replaceURLWithHTMLLinks(msg.val());
        socket.emit('chat message', {
            msg: msj,
        });
        chat.append($(drawDiv(["own"],2)).html(drawDiv([msj],3)));
    }
    msg.val('');
    goBot();
};

function goBot() { //Voy al fondo del div de mensajes
    var height = chat[0].scrollHeight;
    chat.scrollTop(height);
}

function setData() { //Guardo los datos del modal de configuracion
    var final_name = cm_name.val().replace(/[^0-9a-zA-Z ]+/g, "");
    var invalid_name = final_name.length > 15 || final_name.length < 2;

    configs.show_sv_notif = cm_svnot.prop('checked');
    configs.show_cnx_notif = cm_svcnx.prop('checked');

    if (invalid_name) {
        alert("Nombre invalido!");
    } else {
        configs.name = invalid_name ? configs.name : final_name;
        configs.show_sv_notif = cm_svnot.prop('checked');
        configs.show_cnx_notif = cm_svcnx.prop('checked');

        cm_name.val(final_name);

        socket.emit('changeData', {
            name: final_name
        });
    }
    goBot();
}

function setPrv(id) {
    if (configs.owner) prv_kick.show();
    prv_dismiss.show();
    prv_id.val(id);
    goBot();
}

function unsetPrv() {
    prv_kick.hide();
    prv_dismiss.hide();
    prv_id.val('');
    goBot();
}

function kickPrv() {
    socket.emit('kickPrv', prv_id.val());
    unsetPrv();
}

function replaceURLWithHTMLLinks(text) {
    var exp = /(\b(((https?|ftp|file|):\/\/)|www[.])[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    text = text.replace(/.*?:\/\//g, "");
    text = text.replace(exp, "<a target='_blank' href='http://$1'>$1</a>");
    return text;
}

$(document).ready(function() {
    msg.focus();
    msg.keyup(function(e) {
        if (e.keyCode == 13) emitir();
    });

    $('#imagefile').on('change', function(e) {
        var file = e.originalEvent.target.files[0] || null,
            reader = new FileReader(),
            acceptedFormats = ["image/jpeg","image/png","image/gif"],
            s_prv_id = prv_id.val().length > 1 ? prv_id.val() : null;

        if(acceptedFormats.indexOf(file.type) < 0){
            notify("El formato del archivo no es aceptado");
            return;
        }else{
            if(!file) return;
            reader.onload = function(evt) {
                if(evt.target.result.length > 14967820){
                    notify("La imagen es muy pesada");
                    uploadAvailable(true);
                    return;
                }else{
                    chat.append($(drawDiv([],6)).css("background-image","url("+evt.target.result+")"));
                    goBot();
                    
                    if (s_prv_id) {
                        socket.emit('image message', {image:evt.target.result,to:s_prv_id});
                    }else{
                        socket.emit('image message', {image:evt.target.result});
                    }  
                }
            };
            uploadAvailable(false);
            reader.readAsDataURL(file);
            $('#imagefile').val("");
        }
    });
});

socket.on('bienvenido', function(d) {
    configs.owner = d.owner;
    configs.color = d.color;
    configs.name = d.name;

    if (d.img) {
        configs.bg_img = d.img;
        cambiarBg(configs.bg_img);
    }

    chat.append($(drawDiv(["server"],2)).html(drawDiv([d.msg],1)));
    goBot();
});

//Seteo los listeners del socket
socket.on('chat message', function(d) {
    var msj_class = d.owner ? "owner" : "other";
    d.color = d.owner ? "#fff" : d.color;
    chat.append($(drawDiv([msj_class],2)).html(drawDiv([d.id,d.usr,d.color,d.msg],7)));
    goBot();
});

socket.on('prvt message', function(d) {
    chat.append($(drawDiv(["prvt"],2)).html(drawDiv([d.feedback,d.usr_from,d.usr_to,d.msg],8)));
    goBot();
});

socket.on('server message', function(d) {
    if (configs.show_sv_notif) {
        switch (d.type) {
            case "cnx":
                if (configs.show_cnx_notif) chat.append($(drawDiv(["server"],2)).html(drawDiv([d.msg],1)));
                break;
            case "dcnx":
                if (configs.show_cnx_notif) chat.append($(drawDiv(["server"],2)).html(drawDiv([d.color,d.usr],5)));
                break;
            default:
                if (configs.show_sv_notif) chat.append($(drawDiv(["server"],2)).html(drawDiv([d.msg],1)));
        }
    }
    goBot();
});

socket.on('image message', function(data){
    chat.append($(drawDiv([data.img,data.username],4)).css("background-image","url("+sv+data.img+")"));
    goBot();
});

socket.on('disconnect', function () {
    chat.append($(drawDiv(["error"],2)).html(drawDiv(["Fuiste desconectado de la sala"],1)));
    if(configs.show_sv_notif) notify("Fuiste desconectado de la sala");
});

socket.on('changeRoom', function(d) {
    cambiarBg(d);
});

socket.on('alerta', function(d) {
    switch (d.type){
        case "cnx":
            if(configs.show_sv_notif) chat.append($(drawDiv(["server"],2)).html(drawDiv([d.msg],1)));
            break;
        case "notif":
            if(configs.show_sv_notif) chat.append($(drawDiv(["notif"],2)).html(drawDiv([d.msg],1)));
            break;
        case "error":
            chat.append($(drawDiv(["error"],2)).html(drawDiv([d.msg],1)));
            if(configs.show_sv_notif) notify(d.msg);
            break;
        case "media":
            if(d.msg) chat.append($(drawDiv(["media-notif"],2)).html(drawDiv([d.msg],1)));
            uploadAvailable(true);
            break;
        default:
            if(configs.show_sv_notif) chat.append($(drawDiv(["server"],2)).html(drawDiv([d.msg],1)));
            break;
    }
    goBot();
});

function previewImage(img,username){
    $.fancybox.open([{href : sv+img, title: username}],{padding:5,closeBtn:true});
}

function uploadAvailable(status){   
    if(!status){
        photo_available.css('display','none');
        photo_unavailable.css('display','inline-block');
    }else{
        photo_available.css('display','inline-block');
        photo_unavailable.css('display','none');
    }
    $('.loading').hide();
}

function notify(msj){
    alert_error.text(msj);
    alert_modal.modal('show');
}

function drawDiv(messages,option){
    var devolucion = "";

    switch(option){
        case 1:
            devolucion = '<div class="media-body"><h5 class="media-heading">' + messages[0] + '</h5></div>';
        break;
        case 2:
            devolucion = '<div class="media '+messages[0]+'">';
        break;
        case 3:
            devolucion = '<div class="media-body"><h5 class="media-heading" style="font-weight: bold">Yo: </h5>' + messages[0] + '</div>';
        break;
        case 4:
            devolucion = '<button class="media image" onclick="previewImage(\''+messages[0]+'\',\''+messages[1]+'\')"><span class="label label-info">'+messages[1]+'</span></button></br>';
        break;
        case 5:
            devolucion = '<div class="media-body"><h5 class="media-heading"><span style="color:' + messages[0] + '; font-weight: bold;">' + messages[1] + '</span> se desconectó.</h5></div>';
        break;
        case 6:
            devolucion = '<button class="media image loading"><span class="btn btn-info"><span class="glyphicon glyphicon-repeat gly-spin" aria-hidden="true"></span></span></button>';
        break;
        case 7:
            devolucion = '<div class="media-body"><a href="#msg_input"><h5 onclick="setPrv(\'' + messages[0] + '\',\'' + messages[1] + '\');" class="media-heading name" style="color:' + messages[2] + '; font-weight: bold;">' + messages[1] + ':</h5></a>' + messages[3] + '</div>';
        break;
        case 8:
            devolucion = '<div class="media-body"><a href="#msg_input"><h5 onclick="setPrv(\'' + messages[0] + '\');" class="media-heading name" style="color:white; font-weight: bold;">' + messages[1] + ' > ' + messages[2] + ':</h5></a>' + messages[3] + '</div>'
        break;
        default:
            devolucion = '<div></div>'
        break;
    }

    return devolucion;
}