console.log('Example script loaded successfully!');

document.addEventListener('DOMContentLoaded', function() {
  const heading = document.querySelector('h1');
  if (heading) {
    heading.style.transition = 'color 0.3s';
    heading.addEventListener('mouseenter', function() {
      this.style.color = '#007bff';
    });
    heading.addEventListener('mouseleave', function() {
      this.style.color = '#333';
    });
  }
});
