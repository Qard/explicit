"use strict";

/*jslint nomen: true*/

var Lab = require("lab"),
    lab = Lab.script(),
    expect = Lab.expect,
    describe = lab.describe,
    it = lab.it,
    applyDefinitions = require("../lib/applyDefinitions"),
    nodemock = require("nodemock");


describe("Applying simple definitions", function () {

    function expect(a, b) {
        Lab.expect(applyDefinitions(a, {
            plugins: []
        })).to.be.deep.equal(b);
    }

    it("should just pass back raw content", function (done) {
        expect({
            $one: true,
            _raw: true,
            _rawContent: 1
        }, 1);
        done();
    });

    it("should return the method of a simple raw object", function (done) {
        function op() {
            return undefined;
        }
        expect({
            $one: true,
            $: op
        }, op);
        done();
    });

    it("should map all entries in an array", function (done) {
        expect([{
            _raw: true,
            _rawContent: 1
        }, {
            _raw: true,
            _rawContent: 2
        }], [1, 2]);
        done();
    });

    it("should map all entries of an object", function (done) {
        function op() {
            return undefined;
        }
        expect({
            a: {
                _raw: true,
                _rawContent: 1
            },
            b: {
                $: op
            }
        }, {
            a: 1,
            b: op
        });
        done();
    });
});

describe("Attempt using of plugins", function () {
    var expect = Lab.expect;

    it("should allow plugins that do nothing", function (done) {
        function op() {
            return undefined;
        }
        expect(applyDefinitions({$one: true, $: op}, {
            plugins: [{}]
        })).to.equal(op);
        done();
    });

    it("should allow augmentation of the method", function (done) {
        var mock = nodemock.mock("test").takes(2).returns(3),
            originalTest = mock.test,
            method = applyDefinitions({
                $one: true,
                $: mock.test,
                $test: true
            }, {
                plugins: [{
                    name: "test",
                    augment: function (definition, method) {
                        expect(definition.$).to.eql(method);
                        expect(method).to.eql(originalTest);
                        return function (a) {
                            return method(a + 1);
                        };
                    }
                }]
            });
        expect(method(1)).to.equal(3);
        expect(method.$wraps).to.deep.equal([originalTest]);
        mock.assert();
        done();
    });

    it("should store the augmentation stack", function (done) {
        function a() { return undefined; }
        function b() { return undefined; }
        function c() { return undefined; }

        var method = applyDefinitions({
                $one: true,
                $: a,
                $b: true,
                $c: true
            }, {
                plugins: [{
                    name: "b",
                    augment: function () {
                        return b;
                    }
                }, {
                    name: "c",
                    augment: function () {
                        return c;
                    }
                }]
            });
        expect(method).to.equal(c);
        expect(method.$wraps).to.deep.equal([b, a]);
        done();
    });

    it("should not extend the stack if the augmentation didn't yield a method", function (done) {
        function a() { return undefined; }

        var method = applyDefinitions({
                $one: true,
                $: a,
                $test: true
            }, {
                plugins: [{
                    name: "test",
                    augment: function () {
                        return a;
                    }
                }]
            });
        expect(method).to.equal(a);
        expect(method.$wraps).to.equal(undefined);
        done();
    });

    it("should allow attaching definitions on a method", function (done) {
        function op() { return undefined; }

        /*jslint unparam: true */
        var result = applyDefinitions({
            $one: true,
            $: op,
            $test: true
        }, {
            plugins: [{
                name: "test",
                attach: function (definition, method) {
                    method.foo = "bar";
                }
            }]
        });
        expect(result).to.equal(op);
        expect(result.foo).to.equal("bar");
        expect(result.$wraps).to.equal(undefined);
        done();
    });

    it("should throw an error when a plugin doesn't augment properly", function (done) {
        function op() { return undefined; }

        try {
            applyDefinitions({
                $one: true,
                $: op,
                $test: true
            }, {
                plugins: [{
                    name: "test",
                    augment: function () {
                        return undefined;
                    }
                }]
            });
        } catch (e) {
            expect(e.message).to.equal("Augmentation: The plugin 'test' does not return a method.");
            return done();
        }
        throw new Error("Shouldn't arrive here");
    });
});

exports.lab = lab;