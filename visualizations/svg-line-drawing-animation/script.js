var pathEls = document.querySelectorAll('path');
var previewAnimations = [];
var exportAnimations = null;

function wrapAlternateTime(animation, timeMs) {
  var baseDuration = animation && typeof animation.duration === 'number' ? animation.duration : 0;
  if (!baseDuration || !isFinite(baseDuration) || baseDuration <= 0) {
    return Math.max(0, timeMs || 0);
  }

  var cycleDuration = baseDuration * 2;
  var wrappedTime = ((timeMs || 0) % cycleDuration + cycleDuration) % cycleDuration;
  if (wrappedTime <= baseDuration) {
    return wrappedTime;
  }

  return baseDuration - (wrappedTime - baseDuration);
}

function createPathAnimations(autoplay) {
  var animations = [];

  for (var i = 0; i < pathEls.length; i++) {
    var pathEl = pathEls[i];
    var offset = anime.setDashoffset(pathEl);
    pathEl.setAttribute('stroke-dasharray', offset);
    pathEl.setAttribute('stroke-dashoffset', offset);

    animations.push(anime({
      targets: pathEl,
      strokeDashoffset: [offset, 0],
      duration: 2000 + (i % 5) * 250,
      delay: (i % 8) * 180,
      loop: true,
      direction: 'alternate',
      easing: 'easeInOutSine',
      autoplay: autoplay
    }));
  }

  return animations;
}

previewAnimations = createPathAnimations(true);

window.renderFrame = async function (timeMs) {
  if (!exportAnimations) {
    for (var i = 0; i < previewAnimations.length; i++) {
      previewAnimations[i].pause();
    }
    exportAnimations = createPathAnimations(false);
  }

  for (var j = 0; j < exportAnimations.length; j++) {
    var animation = exportAnimations[j];
    animation.seek(wrapAlternateTime(animation, timeMs));
    animation.pause();
  }
};
