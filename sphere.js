var $document = $(document);
var $container = $('#container');

var WIDTH = $document.width() * 7.0 / 10;
var HEIGHT = $document.height();

var VIEW_ANGLE = 45,
    ASPECT = WIDTH / HEIGHT,
    NEAR = 0.1,
    FAR = 10000;

// create a WebGL renderer, camera
// and a scene
var renderer = new THREE.WebGLRenderer({
    antialias: true
});
renderer.autoClear = false;
var camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
var scene = new THREE.Scene();
var scene2 = new THREE.Scene();

camera.position.x = 2.5;
camera.position.y = 2.5;
camera.position.z = 2.5;
camera.up = new THREE.Vector3(0, 0, 1);
camera.lookAt(new THREE.Vector3(0, 0, 0));
scene.add(camera);

// start the renderer
renderer.setSize(WIDTH, HEIGHT);

// attach the render-supplied DOM element
$container.append(renderer.domElement);

var spheregeometry = new THREE.SphereGeometry(1, 50, 50);
var spherematerial = new THREE.MeshNormalMaterial({
    transparent: true,
    opacity: 0.5,
});
var sphere = new THREE.Mesh(spheregeometry, spherematerial);
sphere.position.set(0, 0, 0);
scene.add(sphere);

var direction = new THREE.Vector3(-1, 2, 1);
var r = new THREE.ArrowHelper(direction.normalize(), new THREE.Vector3(0, 0, 0), 1, 0xffffff);
r.line.material.linewidth = 2;
scene.add(r);

var linematerial = new THREE.LineBasicMaterial({
    color: 0x0000ff
});
var geometry = new THREE.Geometry();
geometry.vertices.push(new THREE.Vector3(-1.1, 0, 0));
geometry.vertices.push(new THREE.Vector3(1.1, 0, 0));
var line = new THREE.Line(geometry, linematerial);
scene.add(line);
geometry = new THREE.Geometry();
geometry.vertices.push(new THREE.Vector3(0, -1.1, 0));
geometry.vertices.push(new THREE.Vector3(0, 1.1, 0));
line = new THREE.Line(geometry, linematerial);
scene.add(line);
geometry = new THREE.Geometry();
geometry.vertices.push(new THREE.Vector3(0, 0, -1.1));
geometry.vertices.push(new THREE.Vector3(0, 0, 1.1));
line = new THREE.Line(geometry, linematerial);
scene.add(line);

controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.zoomSpeed = 0.04;
controls.minDistance = 3;
controls.maxDistance = 5;
//controls.addEventListener('change', render);

var $x = $('<div style="position: absolute; top: 10px; left: 10px; color: white;"></div>');
$x.text("u");
$container.append($x);
var $y = $('<div style="position: absolute; top: 10px; left: 10px; color: white;"></div>');
$y.text("v");
$container.append($y);
var $z = $('<div style="position: absolute; top: 10px; left: 10px; color: white;"></div>');
$z.text("w");
$container.append($z);

function positionText(pos3D, el) {
    v = pos3D.project(camera);
    var left = WIDTH * (v.x + 1) / 2;
    var top = HEIGHT * (-v.y + 1) / 2;
    el.css({
        left: left,
        top: top
    });
}

var pos = 0;

function createPoint(vec) {
    var dotGeometry = new THREE.Geometry();
    dotGeometry.vertices.push(vec);
    var dotMaterial = new THREE.PointsMaterial({
        size: 1,
        transparent: true,
        sizeAttenuation: false
    });
    var dot = new THREE.Points(dotGeometry, dotMaterial);
    scene2.add(dot);
    return dot;
}

var idx = 0;
var points = [];
var detuning = 1;
var rabiFrequency = 0;
var vec = direction;
var commands = [];
var a = -1;
var alimit = -1;
var completed = true;
var paused = true;

function updateQueue() {
    $('#queuetable > tbody').html('');
    $('#queuetable > tbody:last-child').append('<tr><th>Pulse</th><th>Rabi frequency</th><th>Detuning</th></tr>');
    if (alimit > 0) {
        var a = (Math.round(alimit * 100) / 100).toFixed(2);
        var b = (Math.round(rabiFrequency * 100) / 100).toFixed(2);
        var c = (Math.round(detuning * 100) / 100).toFixed(2);
        $('#queuetable > tbody:last-child').append('<tr><td>' + a + '</td><td>' + b + '</td><td>' + c + '</td></tr>');
    }
    for (var i = 0; i < commands.length; ++i) {
        var a = (Math.round(commands[i][0] * 100) / 100).toFixed(2);
        var b = (Math.round(commands[i][1] * 100) / 100).toFixed(2);
        var c = (Math.round(commands[i][2] * 100) / 100).toFixed(2);
        $('#queuetable > tbody:last-child').append('<tr><td>' + a + '</td><td>' + b + '</td><td>' + c + '</td></tr>');
    }
}

function render() {
    positionText(new THREE.Vector3(1.1, 0, 0), $x);
    positionText(new THREE.Vector3(0, 1.1, 0), $y);
    positionText(new THREE.Vector3(0, 0, 1.1), $z);
    loop();
    r.setDirection(vec);

    if (!paused) {
        if (points.length < 500) {
            for (var i = 0; i < idx; ++i) {
                points[i].material.opacity *= 0.98;
            }
            ++idx;
            points.push(createPoint(vec));
        } else {
            for (var i = idx - 500; i < idx; i++) {
                points[(i + points.length) % points.length].material.opacity *= 0.97;
            }
            var pt = points[idx++ % points.length];
            pt.geometry.vertices[0] = vec;
            pt.material.opacity = 1;
            pt.geometry.verticesNeedUpdate = true;
        }
    }

    renderer.render(scene, camera);
    renderer.clearDepth();
    renderer.render(scene2, camera);

    var rx = (Math.round(vec.x * 100) / 100).toFixed(2);
    var ry = (Math.round(vec.y * 100) / 100).toFixed(2);
    var rz = (Math.round(vec.z * 100) / 100).toFixed(2);
    $("#descpanel").text("(u = " + rx + ", v = " + ry + ", w = " + rz + ")");
}

function loop() {
    vec = direction.clone().applyMatrix3(transformation(rabiFrequency, detuning, a / gr(rabiFrequency, detuning))).normalize();
    if (a > alimit) {
        vec = direction.clone().applyMatrix3(transformation(rabiFrequency, detuning, alimit / gr(rabiFrequency, detuning))).normalize();
        direction = vec;
        completed = true;
    }
    if (completed) {
        if (commands.length > 0) {
            var next = commands.shift();
            alimit = next[0];
            rabiFrequency = next[1];
            detuning = next[2];
            completed = false;
        } else {
            alimit = 0;
            rabiFrequency = 0;
            detuning = 1;
        }
        a = 0;
        updateQueue();
    }
    if (paused) return;
    if (!completed) {
        a += 0.01;
    }
}

function renderLoop() {
    render();
    setTimeout(function() {
        renderLoop();
    }, 50);
}

function p2(k) {
    return Math.pow(k, 2);
}

function gr(rabi, detuning) {
    return Math.sqrt(p2(rabi) + p2(detuning));
}

function transformation(r, d, t) {
    var g = gr(r, d);
    return new THREE.Matrix3().fromArray([
        (p2(r) + p2(d) * Math.cos(g * t)) / p2(g), -d * Math.sin(g * t) / g, -d * r * (1 - Math.cos(g * t)) / p2(g),
        d * Math.sin(g * t) / g, Math.cos(g * t), r * Math.sin(g * t) / g, -d * r * (1 - Math.cos(g * t)) / p2(g), -r * Math.sin(g * t) / g, (p2(d) + p2(r) * Math.cos(g * t)) / p2(g)
    ]);
}

function updatePosition() {
    direction = new THREE.Vector3(math.eval($("#u").val()), math.eval($("#v").val()), math.eval($("#w").val())).normalize();
    if (direction.x == 0 && direction.y == 0 && direction.z == 0) {
        direction = new THREE.Vector3(0, 0, -1);
    }
    vec = direction;
}

function togglePaused() {
    paused = !paused;
    if (paused) {
        $('#pauseButton').text('Start');
    } else {
        $('#pauseButton').text('Pause');
    }
}

function addNewPulse() {
    pulse = math.eval($("#pulse").val());
    freq = math.eval($("#freq").val());
    detune = math.eval($("#detune").val());
    commands.push([pulse, freq, detune]);
}

renderLoop();
