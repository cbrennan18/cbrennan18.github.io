function calculateTime() {
    // Set the date we're counting down to
    const countDownDate = new Date("Dec 1, 2019 00:00:00").getTime();

    // Update the count down every 1 second
    const x = setInterval(function () {

        // Get todays date and time
        const now = new Date().getTime();

        // Find the distance between now an the count down date
        const distance = countDownDate - now;

        // Time calculations for days, hours, minutes and seconds
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        // Display the result in an element with id="demo"
        document.getElementById("demo").innerHTML = days + "d " + hours + "h " + minutes + "m " + seconds + "s ";

        // If the count down is finished, write some text
        if (distance < 0) {
            clearInterval(x);
            document.getElementById("demo").innerHTML = "EXPIRED";
        }
    }, 1000);
}

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

function hrefSoftScrollClick() {
    if (/home/.test(window.location.href)) {
        softScrollClick();
        return false;
    }
    else {
        window.location.href = "./home.html#scroll1"
        softScrollClick();
        return false;
    }
}

function softScrollClick() {
    $('html, body').animate({
        scrollTop: $("#scroll1").offset().top
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
