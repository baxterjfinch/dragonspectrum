function PresentationRenderObj() {
    this.div = $('<div></div>');
    this.slide_span = $('<span></span>');
    this.heading = $('<h1></h1>');
    this.listUL = $('<ul></ul>');
    this.caption = $('<h5 class="pres-caption"></h5>');
    this.slide_span.append(this.heading);
    this.slide_span.append(this.listUL);
    this.div.append(this.slide_span);
}
