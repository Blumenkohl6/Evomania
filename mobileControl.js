var md = new MobileDetect(window.navigator.userAgent);

function isMobile() {
    return md.mobile() !== null;
}

if (isMobile()) {
    document.getElementById('joystickContainer').classList.remove('hidden');

    var joystick = nipplejs.create({
        zone: document.getElementById('joystickContainer'),
        mode: 'static',
        position: { left: '50px', bottom: '50px' },
        color: 'blue'
    });

    joystick.on('move', function(evt, data) {
        var angle = data.angle.degree;

        if (angle >= 22.5 && angle < 67.5) {
            keys['w'] = true;
            keys['a'] = false;
            keys['s'] = false;
            keys['d'] = true;
        } else if (angle >= 67.5 && angle < 112.5) {
            keys['w'] = true;
            keys['a'] = false;
            keys['s'] = false;
            keys['d'] = false;
        } else if (angle >= 112.5 && angle < 157.5) {
            keys['w'] = true;
            keys['a'] = true;
            keys['s'] = false;
            keys['d'] = false;
        } else if (angle >= 157.5 && angle < 202.5) {
            keys['w'] = false;
            keys['a'] = true;
            keys['s'] = false;
            keys['d'] = false;
        } else if (angle >= 202.5 && angle < 247.5) {
            keys['w'] = false;
            keys['a'] = true;
            keys['s'] = true;
            keys['d'] = false;
        } else if (angle >= 247.5 && angle < 292.5) {
            keys['w'] = false;
            keys['a'] = false;
            keys['s'] = true;
            keys['d'] = false;
        } else if (angle >= 292.5 && angle < 337.5) {
            keys['w'] = false;
            keys['a'] = false;
            keys['s'] = true;
            keys['d'] = true;
        } else {
            keys['w'] = false;
            keys['a'] = false;
            keys['s'] = false;
            keys['d'] = true;
        }
    });

    joystick.on('end', function() {
        keys['w'] = false;
        keys['a'] = false;
        keys['s'] = false;
        keys['d'] = false;
    });
}