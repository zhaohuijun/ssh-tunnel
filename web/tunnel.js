$(function () {
    $(".nav.navbar-nav li a").click(function(){
        var path = $(this).attr("path");
        if(path){
	        $(".nav.navbar-nav li.active").removeClass("active");
	        $(this).parent("li").addClass("active");
	        $("#container > div").hide();
	        $("#container #container-"+path).show();
        	eval('update_'+path+'()');
        }else{
        	var action = $(this).attr("action");
        	//console.log(action);
        	if(action){
        		eval(action+'()');
        	}
        }
    });
    $(".nav.navbar-nav li a[path]")[0].click();
    $(".nav.navbar-nav li a[action]").hide();
    $(".nav.navbar-nav li a[action='start']").show();
    $(".nav.navbar-nav li a[action='save']").show();
    $(".nav.navbar-nav li a[action='clearLog']").show();
    
    $("#inputIP")[0].value = conf.ip;
    $("#inputPORT")[0].value = conf.port;
    $("#inputUSER")[0].value = conf.user;
    $("#inputKEY")[0].value = conf.key;
    
    pos = $("#container").position();
    var height = window.innerHeight - pos.top - 10;
    $("#container").css('height', height+'px');
    
    $("#local_add").click(local_add);
    $("#remote_add").click(remote_add);
    
    init_local();
    init_remote();
});

var fs = require('fs');

var baseDir = './';
var dstExe = 'ssh-tunnel.exe';
if(process.execPath.substr(-dstExe.length) == dstExe){
	var cmd = process.execPath;
	baseDir = cmd.substr(0, cmd.length-dstExe.length);
}

var confFile = baseDir+'ssh-tunnel.json';

try{
	var conf = require(confFile);
}catch(e){
	console.log(e);
	var conf = {
		user: 'root',
		ip: '127.0.0.1',
		port: '22',
		local:[],
		remote:[]
	};
}

console.log(conf);

function clearLog()
{
	$('#container-log').html('');
}

function save()
{
	console.log('save');
	conf.user = $("#inputUSER")[0].value;
	conf.ip = $("#inputIP")[0].value;
	conf.port = $("#inputPORT")[0].value;
	conf.key = $("#inputKEY")[0].value;
	try{
		fs.writeFileSync(confFile, JSON.stringify(conf), 'utf8');
	}catch(e){
		$('#container-log').append('err:'+e+'<br/>');
	}
}

var sshProcess = null;
const spawn = require('child_process').spawn;

function closed(){	
	sshProcess = null;
    $(".nav.navbar-nav li a[action='start']").show();
    $(".nav.navbar-nav li a[action='stop']").hide();
}

function log(str, newl=true)
{
	str = str.toString();
	// alert(str);
	var rows = str.split('\n');
	var html = rows.join('<br/>');
	if(newl) html += '<br/>';
	// var html = str.replace(/[\n\r]/, '<br/>') + (newl?'<br/>':'');
	// alert(html);
	$('#container-log').append(html);
	$("#container-end")[0].scrollIntoView();
}

function start(){
	console.log('start');
	if(sshProcess) return;
	
    $(".nav.navbar-nav li a[action='start']").hide();
    $(".nav.navbar-nav li a[action='stop']").show();
    
	var args = ['-N', '-v', '-o StrictHostKeyChecking=no'];
	for(var i in conf.local){
		var l = conf.local[i];
		args.push(`-L ${l.from}:${l.to}`);
	}
	for(var i in conf.remote){
		var r = conf.remote[i];
		args.push(`-R ${r.from}:${r.to}`);
	}
	args = args.concat(['-p '+conf.port, conf.user+'@'+conf.ip]);
	if(conf.key && conf.key.length>0){
		args.push(`-i ${conf.key}`)
	}
	log(args);
	sshProcess = spawn('ssh', args);
	sshProcess.stdout.on('data', function(data){
		log(data);
		// var rows = data.toString().split('\n');
		// var html = rows.join('<br/>');
		// $('#container-log').append(html);
		// $("#container-end")[0].scrollIntoView();
	});
	sshProcess.stderr.on('data', function(data){
		log(data);
		// var rows = data.toString().split('\n');
		// var html = rows.join('<br/>');
		// $('#container-log').append(html);
		// $("#container-end")[0].scrollIntoView();
	});
	sshProcess.on('close',function(code, signal){
		log(`close: ${code},${signal}`);
		closed();
	});
	sshProcess.on('disconnect',function(){
		log('disconnect');
		closed();
	});
	sshProcess.on('error',function(err){
		log(`err: ${err}`);
		closed();
	});
	sshProcess.on('exit',function(code, signal){
		log(`exit: ${code},${signal}`);
		closed();
		log('tunnel closed');
		// $('#container-log').append('tunnel closed</br>');
		// $("#container-end")[0].scrollIntoView();
	});
}

function stop(){
	log('stop');
	if(sshProcess) sshProcess.kill();
}

function restart(){
	console.log('restart');
}

function init_local()
{
	$('#localTable').bootstrapTable({
    	data: conf.local,
    	striped: true,
    	columns: [
	    	{field:'desc', title:'描述',sortable:true},
	    	{field:'from', title:'端口',sortable:true},
	    	{field:'to', title:'目标'},
	    	{field:'user', title:'用户'},
	    	{
	    		field:'operate', title:'操作',
		    	formatter:function(value, row, index){
		    		var ssh = `<a class="ssh ml10" href="#"  title="ssh"><i class="glyphicon glyphicon-log-in"></i></a>`;
		    		var explorer = `<a class="explorer ml10" href="#"  title="explorer"><i class="glyphicon glyphicon-eye-open"></i></a>`;
		    		var del = `<a class="del ml10" href="#"  title="del"><i class="glyphicon glyphicon-remove"></i></a>`;
		    		var sep = '<a class="ml10">&nbsp;&nbsp;</a>'
		    		return ssh+sep+explorer+sep+del;
		    	},
		    	events:{
		    		'click .ssh': function(e,value,row,index){
//		    			console.log(arguments);
						if(!row.user) row.user = 'root';
                        if (process.platform=='linux'){
                            var sshcmd = `ssh -o StrictHostKeyChecking=no -p ${row.from} -l ${row.user} 127.0.0.1 `
														if(conf.key && conf.key.length>0){
															sshcmd += ` -i ${conf.key} `
														}
														log(sshcmd)
                            var args = [`-e "${sshcmd}"`]
                            spawn('gnome-terminal', args, {shell: true, detached: true});
                        }else{
    						var args = ['-o StrictHostKeyChecking=no', `-p ${row.from}`, `-l ${row.user}`, '127.0.0.1'];
    						spawn('ssh', args, {shell: true, detached: true});
                        }
		    		},
		    		'click .explorer': function(e,value,row,index){
		    			console.log(arguments);
		    			var path = row.user || '';
						var args = [`http://127.0.0.1:${row.from}/${path}`];
						spawn('explorer', args, {detached: true});
		    		},
		    		'click .del': function(e,value,row,index){
		    			console.log(arguments);
						$("#local_desc")[0].value = row.desc;
						$("#local_from")[0].value = row.from;
						$("#local_to")[0].value = row.to;
						$("#local_user")[0].value = row.user;
		    			conf.local.splice(index,1);
		    			$('#localTable').bootstrapTable('load', conf.local);
		    		}
		    	}
	    	}
    	]
	});
}
function init_remote()
{
	$('#remoteTable').bootstrapTable({
    	data: conf.remote,
    	striped: true,
    	columns: [
    	{field:'desc', title:'描述',sortable:true},
    	{field:'from', title:'端口',sortable:true},
    	{field:'to', title:'目标'},
    	{
	    		field:'operate', title:'操作',
		    	formatter:function(value, row, index){
		    		var del = `<a class="del ml10" href="#"  title="del"><i class="glyphicon glyphicon-remove"></i></a>`;
		    		var sep = '<a class="ml10">&nbsp;&nbsp;</a>'
		    		return del;
		    	},
		    	events:{
		    		'click .del': function(e,value,row,index){
		    			console.log(arguments);
		    			conf.remote.splice(index,1);
		    			$('#remoteTable').bootstrapTable('load', conf.remote);
		    		}
		    	}
	    	}
    	]
	});
}

function update_log()
{
	$("#container-end")[0].scrollIntoView();
}

function update_local()
{
	$('#localTable').bootstrapTable('refreshOptions', {
	});
}

function update_remote()
{
	$('#remoteTable').bootstrapTable('refreshOptions', {
	});
}

function local_add()
{
	var desc = $("#local_desc")[0].value;
	var from = $("#local_from")[0].value;
	var to = $("#local_to")[0].value;
	var user = $("#local_user")[0].value;
	if(!from || !to){
		alert('端口和目标不能为空');
		return;
	}
	for(var i in conf.local){
	    var l = conf.local[i];
	    if(l.from == from){
            alert('端口不能重复');
            return;
	    }
	}
	conf.local.push({
		desc: desc,
		from: from,
		to: to,
		user: user
	});
	$('#localTable').bootstrapTable('load', conf.local);
}
function remote_add()
{
	var desc = $("#remote_desc")[0].value;
	var from = $("#remote_from")[0].value;
	var to = $("#remote_to")[0].value;
	if(!from || !to){
		alert('端口和目标不能为空');
		return;
	}
	for(var i in conf.remote){
	    var r = conf.remote[i];
	    if(r.from == from){
            alert('端口不能重复');
            return;
	    }
	}
	conf.remote.push({
		desc: desc,
		from: from,
		to: to
	});
	$('#remoteTable').bootstrapTable('load', conf.remote);
}


