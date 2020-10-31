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
function scrollAnimation() {
    if (window.location.hash)
        scroll(0,0);
    setTimeout(function(){scroll(0,0);},1);
    $(document).ready(function() {
        $('.nav-scroll').on('click',function(e){
            let url = window.location.href;
            if (url.indexOf("index") > -1) {
                e.preventDefault();
                let href = $(this).attr("href");
                let str = href.split("#");
                str = "#" + str[1];
                $("html, body").animate({scrollTop: $(str).offset().top}, 800, 'swing');
            }
        });
    });
    if(window.location.hash){
        $('html,body').animate({scrollTop:$(window.location.hash).offset().top}, 800, 'swing');
    }
}

function Scroll() {
    $(document).ready(function() {
        $("html, body").animate({scrollTop: 0}, "slow");
        return false;
    });
}