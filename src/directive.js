import debounce from './utils/debouncer.js';

const DEFAULT_EVENT_NAME = 'veeValidate';

const getScope = (el) => el.dataset.scope || el.form.dataset.scope || undefined;

const hasFieldDependency = (rules) => {
    const results = rules.split('|').filter(r => !! r.match(/confirmed|after|before/));
    if (! results.length) {
        return false;
    }

    return results[0].split(':')[1];
};

export default (options) => ({
    onInput() {
        this.vm.$validator.validate(this.fieldName, this.el.value, getScope(this.el));
    },
    onFileInput() {
        if (! this.vm.$validator.validate(this.fieldName, this.el.files, getScope(this.el))
        && this.modifiers.reject) {
            this.el.value = '';
        }
    },
    attachValidatorEvent() {
        let callback;
        const elScope = getScope(this.el);
        if (! elScope) {
            callback = this.expression ? () => {
                this.vm.$validator.validate(this.fieldName, this.el.value, getScope(this.el));
            } : () => {
                this.handler();
            };
        } else {
            callback = this.expression ? (scope) => {
                if (scope === elScope) {
                    this.vm.$validator.validate(this.fieldName, this.el.value, getScope(this.el));
                }
            } : (scope) => {
                if (scope === elScope) {
                    this.handler();
                }
            };
        }


        this.validateCallback = callback;
        this.vm.$on(DEFAULT_EVENT_NAME, this.validateCallback);
        const fieldName = hasFieldDependency(this.el.dataset.rules);
        if (this.el.dataset.rules && fieldName) {
            this.vm.$once('validatorReady', () => {
                document.querySelector(`input[name='${fieldName}']`)
                        .addEventListener('input', this.validateCallback);
            });
        }
    },
    bind() {
        this.vm.$nextTick(() => {
            this.fieldName = this.expression || this.el.name;
            this.vm.$validator.attach(this.fieldName, this.el.dataset.rules, this.el.dataset.as);
            if (this.expression) {
                this.attachValidatorEvent();

                return;
            }

            const handler = this.el.type === 'file' ? this.onFileInput : this.onInput;
            this.handles = this.el.type === 'file' ? 'change' : 'input';

            const delay = this.el.dataset.delay || options.delay;
            this.handler = delay ? debounce(handler.bind(this), delay) : handler.bind(this);
            this.el.addEventListener(this.handles, this.handler);
            this.attachValidatorEvent();
        });
    },
    update(value) {
        if (! this.expression) {
            return;
        }

        if (this.modifiers.initial) {
            this.modifiers.initial = false;

            return;
        }

        // might be not ready yet.
        if (! this.fieldName) {
            this.vm.$nextTick(() => {
                this.vm.$validator.validate(this.fieldName, value);
            });

            return;
        }

        this.vm.$validator.validate(this.fieldName, value);
    },
    unbind() {
        if (this.handler) {
            this.el.removeEventListener(this.handles, this.handler);
        }

        this.vm.$validator.detach(this.fieldName);
        this.vm.$off(DEFAULT_EVENT_NAME, this.validateCallback);
    }
});
