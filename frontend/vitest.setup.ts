import "@testing-library/jest-dom";

// jsdom doesn't implement scrollIntoView - stub it so components that call
// it (e.g. StepListView's auto-scroll-to-current-step) can still render.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
