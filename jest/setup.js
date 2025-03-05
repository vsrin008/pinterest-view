import Enzyme from "enzyme";
import Adapter from "@wojtekmaj/enzyme-adapter-react-17";

Enzyme.configure({ adapter: new Adapter() });

global.window.requestAnimationFrame = (callback) => setTimeout(callback, 1);

global.window.cancelAnimationFrame = () => {};
