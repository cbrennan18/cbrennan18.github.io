function includeHTML() {
    var z, i, elmnt, file, xhttp;
    /* Loop through a collection of all HTML elements: */
    z = document.getElementsByTagName("*");
    for (i = 0; i < z.length; i++) {
        elmnt = z[i];
        /*search for elements with a certain atrribute:*/
        file = elmnt.getAttribute("w3-include-html");
        if (file) {
            /* Make an HTTP request using the attribute value as the file name: */
            xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function() {
                if (this.readyState === 4) {
                    if (this.status === 200) {elmnt.innerHTML = this.responseText;}
                    if (this.status === 404) {elmnt.innerHTML = "Page not found.";}
                    /* Remove the attribute, and call this function once more: */
                    elmnt.removeAttribute("w3-include-html");
                    includeHTML();
                }
            }
            xhttp.open("GET", file, true);
            xhttp.send();
            /* Exit the function: */
            return;
        }
    }
}

function hrefSoftScrollClickAbout() {
    if (/home/.test(window.location.href)) {
        softScrollClickAbout();
        return false;
    }
    else {
        window.location.href = "./index.html#scroll1"
        softScrollClickAbout();
        return false;
    }
}
function hrefSoftScrollClickExperience() {
    if (/home/.test(window.location.href)) {
        softScrollClickExperience();
        return false;
    }
    else {
        window.location.href = "./index.html#scroll2"
        softScrollClickExperience();
        return false;
    }
}

function softScrollClickAbout() {
    $('html, body').animate({
        scrollTop: $("#scroll1").offset().top
    }, 2000);
    softScroll();
}

function softScrollClickExperience() {
    $('html, body').animate({
        scrollTop: $("#scroll2").offset().top
    }, 2000);
    softScroll();
}

function softScroll() {
    $("#hero-image").css("opacity", 1 - $(window).scrollTop() / ($('#hero-image').height()));
}
$(document).ready(function(){
    $(window).scroll(function(){
        softScroll();
    });
});
