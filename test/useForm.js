import React from "react";
import { expect } from "chai";
import { mount } from "enzyme";
import sinon from "sinon";
import { useForm, defValidation } from "../src";

import Input from "./components/Input";

describe("useForm", () => {
  function Form() {
    const {$} = useForm({foo: "foo"});

    return (
      <div>
        <Input { ...$("foo") } className="foo" />
      </div>
    );
  }

  it("uses initial value", () => {
    const wrapper = mount(<Form />);
    expect(wrapper.find("input.foo[value='foo']")).to.have.lengthOf(1);
  });

  it("handles input value change", () => {
    const wrapper = mount(<Form />);
    wrapper.find("input.foo").simulate("change", {target: {value: "foo2"}});
    expect(wrapper.find("input.foo[value='foo2']")).to.have.lengthOf(1);
  });

  describe("custom onChange handlers", () => {
    function Form() {
      const {$, set} = useForm({foo: ""});

      return (
        <div>
          <Input { ...$("foo", (k, value) => set(k, value.toUpperCase())) } className="foo" />
        </div>
      );
    }

    it("allows to use custom onChange handler", () => {
      const wrapper = mount(<Form />);
      wrapper.find("input.foo").simulate("change", {target: {value: "foo"}});
      expect(wrapper.find("input.foo[value='FOO']")).to.have.lengthOf(1);
    });

    describe("setting multiple values at once", () => {
      function Form() {
        const {$, set} = useForm({foo: ", bar: "});

        const changeFoo = (k, value) => set({foo: value, bar: value + "bar"});

        return (
          <div>
            <Input { ...$("foo", changeFoo) } className="foo" />
            <Input { ...$("bar") } className="bar" />
          </div>
        );
      }

      it("allows to set multiple values at once via custom onChange handler", () => {
        const wrapper = mount(<Form />);
        wrapper.find("input.foo").simulate("change", {target: {value: "foo"}});
        expect(wrapper.find("input.bar[value='foobar']")).to.have.lengthOf(1);
      });
    });
  });

  describe("validations", () => {
    before(() => {
      defValidation("presence", (value, {message}) => {
        if (!value || (Array.isArray(value) && !value.length)) {
          return message || "Can't be empty";
        }
      });

      defValidation("numericality", (value, {lessThan, lessThanMessage}) => {
        if (!value) return;

        if (+value >= lessThan) {
          return lessThanMessage || `Should be less than ${lessThan}`;
        }
      });
    });

    function Form() {
      const {$, validate} = useForm({foo: ""}, {
        foo: "presence"
      });

      return (
        <div>
          <Input { ...$("foo") } className="foo" />
          <button onClick={ () => validate() } className="validate">Validate</button>
        </div>
      );
    }

    it("provides `validate` helper", () => {
      const wrapper = mount(<Form />);
      expect(wrapper.find(".error")).to.have.lengthOf(0);
      wrapper.find(".validate").simulate("click");
      expect(wrapper.find(".error")).to.have.lengthOf(1);
    });

    it("does not initially validate input on change", () => {
      const wrapper = mount(<Form />);
      wrapper.find("input.foo").simulate("change", {target: {value: ""}});
      expect(wrapper.find(".error")).to.have.lengthOf(0);
    });

    it("validates input on change after validations have been explicitly ran", () => {
      const wrapper = mount(<Form />);
      wrapper.find("input.foo").simulate("change", {target: {value: ""}});
      wrapper.find(".validate").simulate("click");
      expect(wrapper.find(".error")).to.have.lengthOf(1);
      wrapper.find("input.foo").simulate("change", {target: {value: "1"}});
      expect(wrapper.find(".error")).to.have.lengthOf(0);
      wrapper.find("input.foo").simulate("change", {target: {value: ""}});
      expect(wrapper.find(".error")).to.have.lengthOf(1);
    });

    describe("validation and custom onChange handler", () => {
      function Form() {
        const {$, set, validate} = useForm({foo: ""}, {
          foo: "presence"
        });

        return (
          <div>
            <Input { ...$("foo", (k, value) => set(k, value.toUpperCase())) } className="foo" />
            <button onClick={ () => validate() } className="validate">Validate</button>
          </div>
        );
      }

      it("validates on change with custom onChange handler", () => {
        const wrapper = mount(<Form />);
        wrapper.find(".validate").simulate("click");
        expect(wrapper.find(".error")).to.have.lengthOf(1);
        wrapper.find("input.foo").simulate("change", {target: {value: "foo"}});
        expect(wrapper.find(".error")).to.have.lengthOf(0);
        expect(wrapper.find("input.foo[value='FOO']")).to.have.lengthOf(1);
      });
    });

    describe("complex forms of value validation", () => {
      function Form() {
        const {$, validate} = useForm({foo: ""}, {
          foo: [
            "presence",
            {numericality: {lessThan: 10}},
            function(value) {
              if (+value === 5) {
                return "Not five";
              }
            }]
        });

        return (
          <div>
            <Input { ...$("foo") } className="foo" />
            <button onClick={ () => validate() } className="validate">Validate</button>
          </div>
        );
      }

      it("allows to use complex validation", () => {
        const wrapper = mount(<Form />);
        wrapper.find(".validate").simulate("click");
        expect(wrapper.find(".error").text()).to.eq("Can't be empty");
        wrapper.find("input.foo").simulate("change", {target: {value: "11"}});
        expect(wrapper.find(".error").text()).to.eq("Should be less than 10");
        wrapper.find("input.foo").simulate("change", {target: {value: "5"}});
        expect(wrapper.find(".error").text()).to.eq("Not five");
        wrapper.find("input.foo").simulate("change", {target: {value: "3"}});
        expect(wrapper.find(".error")).to.have.lengthOf(0);
      });
    });

    describe("validating multiple values on setting them at once", () => {
      function Form() {
        const {$, set, validate} = useForm({foo: "", bar: ""}, {
          foo: "presence",
          bar: "presence"
        });

        const changeFoo = (k, value) => set({foo: value, bar: value + "bar"});

        return (
          <div>
            <Input { ...$("foo", changeFoo) } className="foo" errorClassName="foo-error" />
            <Input { ...$("bar") } className="bar" errorClassName="bar-error" />

            <button onClick={ () => validate() } className="validate">Validate</button>
          </div>
        );
      }

      it("runs all validations to validate all changes", () => {
        const wrapper = mount(<Form />);
        wrapper.find(".validate").simulate("click");
        expect(wrapper.find(".foo-error")).to.have.lengthOf(1);
        expect(wrapper.find(".bar-error")).to.have.lengthOf(1);
        wrapper.find("input.foo").simulate("change", {target: {value: "foo"}});
        expect(wrapper.find(".foo-error")).to.have.lengthOf(0);
        expect(wrapper.find(".bar-error")).to.have.lengthOf(0);
      });
    });

    describe("complex validation with wildcards", () => {
      function Form() {
        const {get, set, $, getError, validate} = useForm({foos: []}, {
          "foos": "presence",
          "foos.*.value": "presence"
        });

        const setState = () => {
          set("foos", [{}, {value: 1}]);
        };

        return (
          <div>
            { get("foos").map((_item, i) => (
                <Input key={ i } { ...$(`foos.${i}.value`) } wrapperClassName={ `foo-${i}` } />
              ))
            }
            { getError("foos") &&
              <div className="foos-error">{ getError("foos") }</div>
            }
            <button onClick={ setState } className="setState">Set State</button>
            <button onClick={ () => validate() } className="validate">Validate</button>
          </div>
        );
      }

      it("allows to use wildcard validation", () => {
        const wrapper = mount(<Form />);
        wrapper.find(".validate").simulate("click");
        expect(wrapper.find(".foos-error")).to.have.lengthOf(1);
        wrapper.find(".setState").simulate("click");
        expect(wrapper.find(".foos-error")).to.have.lengthOf(0);
        expect(wrapper.find(".foo-0 .error")).to.have.lengthOf(1);
      });
    });

    describe("callbacks usage", () => {
      // eslint-disable-next-line react/prop-types
      function Form({onValid, onError}) {
        const {$, validate} = useForm({foo: ""}, {
          foo: "presence"
        });

        const save = () => {
          validate({ onValid, onError });
        };

        return (
          <div>
            <Input { ...$("foo") } className="foo" />
            <button onClick={ save } className="save">Save</button>
          </div>
        );
      }

      it("allows to use callbacks", async () => {
        const validSpy = sinon.spy();
        const errorSpy = sinon.spy();
        const wrapper = mount(<Form onValid={ validSpy } onError={ errorSpy } />);

        await nextFrame(() => wrapper.find(".save").simulate("click"));

        expect(validSpy).to.have.property("callCount", 0);
        expect(errorSpy).to.have.property("callCount", 1);

        await nextFrame(() => {
          wrapper.find("input.foo").simulate("change", {target: {value: "1"}});
          wrapper.find(".save").simulate("click");
        });

        expect(validSpy).to.have.property("callCount", 1);

        // callbacks are executed within `requestAnimationFrame` wrapper to have
        // new form content rendered.
        function nextFrame(fn) {
          return new Promise((resolve) => {
            fn();
            setTimeout(resolve, 10);
          });
        }
      });
    });
  });
});