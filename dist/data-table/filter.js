function checkbox(options) {
    return { type: 'checkbox', ...options };
}
function radio(options) {
    return { type: 'radio', ...options };
}
function dropdownSearch(options) {
    return { type: 'dropdownSearch', ...options };
}
function dateRange(options) {
    return { type: 'dateRange', ...options };
}
function numberRange(options) {
    return { type: 'numberRange', ...options };
}
function button(options) {
    return { type: 'button', ...options };
}
function link(options) {
    return { type: 'link', ...options };
}
function select(options) {
    return { type: 'select', ...options };
}
function container(controls) {
    return { type: 'container', controls };
}
export const filter = {
    checkbox,
    radio,
    dropdownSearch,
    dateRange,
    numberRange,
    button,
    link,
    select,
    container
};
