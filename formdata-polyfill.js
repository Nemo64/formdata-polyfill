(function () {

    "use strict";

    var basicSupport = typeof window.FormData === 'function';
    var fullSupport = basicSupport
        && typeof window.FormData.prototype.delete === 'function'
        && typeof window.FormData.prototype.get === 'function'
        && typeof window.FormData.prototype.getAll === 'function'
        && typeof window.FormData.prototype.has === 'function'
        && typeof window.FormData.prototype.set === 'function'
    ;

    if (fullSupport) {
        return;
    }

    var originalFormData = null;
    if (basicSupport) {
        originalFormData = window.FormData;
    }

    function FormData(form) {
        if (!this instanceof FormData) {
            throw new TypeError(
                "Failed to construct 'FormData': " +
                "Please use the 'new' operator, this DOM object constructor cannot be called as a function."
            );
        }

        this._data = [];

        if (!form instanceof HTMLFormElement) {
            // the standard implementation actually doesn't think that an error should be thrown
            return;
        }

        for (var i = 0; i < form.elements.length; i++) {
            var formElement = form.elements[i];
            switch (formElement.type) {

                case "submit":
                case "button":
                case "reset":
                case "image":
                    break;

                case "checkbox":
                case "radio":
                    if (formElement.checked) {
                        this.append(formElement.name, formElement.value);
                    }
                    break;

                case "select-multiple":
                    for (var j = 0; j < formElement.options.length; ++j) {
                        var option = formElement.options[j];
                        if (option.selected) {
                            this.append(formElement.name, option.value);
                        }
                    }
                    break;

                // TODO file input

                default:
                    this.append(formElement.name, formElement.value);
            }
        }
    }

    FormData.prototype.append = function (name, value, filename) {
        // TODO implement files
        this._data.push([String(name), value]);
    };

    FormData.prototype.delete = function (name) {
        this._data = this._data.filter(function (obj) {
            return obj[0] !== name;
        });
    };

    FormData.prototype.get = function (name) {
        for (var i = 0; i < this._data.length; i++) {
            var obj = this._data[i];
            if (obj[0] === name) {
                return obj[1];
            }
        }

        return null;
    };

    FormData.prototype.getAll = function (name) {
        var result = [];

        for (var i = 0; i < this._data.length; i++) {
            var obj = this._data[i];
            if (obj[0] === name) {
                result.push(obj[1]);
            }
        }

        return result;
    };

    FormData.prototype.has = function (name) {
        for (var i = 0; i < this._data.length; i++) {
            var obj = this._data[i];
            if (obj[0] === name) {
                return true;
            }
        }

        return false;
    };

    FormData.prototype.set = function (name, value) {
        if (this.has(name)) {
            this.delete(name);
        }

        this.append(name, value);
    };

    // inject into window
    window.FormData = FormData;

    // manipulate xhr to accept the new form data
    var originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (data) {

        // pass everything though if data isn't our emulated version
        if (!data instanceof FormData) {
            return originalSend.apply(this, arguments);
        }

        var result = new Array(data._data.length);
        var sBoundary = "----FormDataPolyfill" + Date.now().toString(16);
        this.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + sBoundary);

        for (var i = 0; i < data._data.length; i++) {
            var obj = data._data[i];

            result[i] = "--" + sBoundary + "\r\n"
                + "Content-Disposition: form-data; name=\"" + obj[0] + "\"\r\n"
                + "\r\n" + obj[1] + "\r\n"
            ;
        }

        data = result.join("") + "--" + sBoundary + "--\r\n";

        if (typeof this.sendAsBinary === 'function') {
            return this.sendAsBinary(data);
        } else {
            return originalSend.call(this, data);
        }
    };

})();