export const FIELD_SELECTOR = [
  'input:not([type="hidden"]):not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])'
].join(', ');

export async function detectFields(page) {
  return page.$$eval(FIELD_SELECTOR, (elements) => {
    function visible(element) {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();

      return (
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        rect.width > 0 &&
        rect.height > 0
      );
    }

    function clean(text) {
      return (text || '').replace(/\s+/g, ' ').trim();
    }

    function labelText(element) {
      const id = element.getAttribute('id');
      const labels = [];

      if (element.labels) {
        for (const label of element.labels) {
          labels.push(label.innerText || label.textContent);
        }
      }

      if (id) {
        const explicit = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (explicit) {
          labels.push(explicit.innerText || explicit.textContent);
        }
      }

      const wrappingLabel = element.closest('label');
      if (wrappingLabel) {
        labels.push(wrappingLabel.innerText || wrappingLabel.textContent);
      }

      return clean([...new Set(labels.map(clean).filter(Boolean))].join(' '));
    }

    function nearbyText(element) {
      const chunks = [];
      const ariaLabelledBy = element.getAttribute('aria-labelledby');

      if (ariaLabelledBy) {
        for (const id of ariaLabelledBy.split(/\s+/)) {
          const labelledBy = document.getElementById(id);
          if (labelledBy) {
            chunks.push(labelledBy.innerText || labelledBy.textContent);
          }
        }
      }

      const describedBy = element.getAttribute('aria-describedby');
      if (describedBy) {
        for (const id of describedBy.split(/\s+/)) {
          const described = document.getElementById(id);
          if (described) {
            chunks.push(described.innerText || described.textContent);
          }
        }
      }

      let current = element.parentElement;
      let depth = 0;
      while (current && depth < 3) {
        chunks.push(current.innerText || current.textContent);
        current = current.parentElement;
        depth += 1;
      }

      return clean(chunks.map(clean).filter(Boolean).join(' ')).slice(0, 500);
    }

    function selectorFor(element, index) {
      const id = element.getAttribute('id');
      if (id) {
        return `#${CSS.escape(id)}`;
      }

      const name = element.getAttribute('name');
      if (name) {
        return `${element.tagName.toLowerCase()}[name="${CSS.escape(name)}"]`;
      }

      return `${element.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
    }

    return elements
      .map((element, index) => {
        const tagName = element.tagName.toLowerCase();
        const type = (element.getAttribute('type') || tagName).toLowerCase();
        const options = tagName === 'select'
          ? [...element.options].map((option) => ({
              label: clean(option.label || option.textContent),
              value: option.value
            }))
          : [];

        return {
          index,
          selector: selectorFor(element, index),
          tagName,
          type,
          name: element.getAttribute('name') || '',
          id: element.getAttribute('id') || '',
          autocomplete: element.getAttribute('autocomplete') || '',
          placeholder: element.getAttribute('placeholder') || '',
          ariaLabel: element.getAttribute('aria-label') || '',
          label: labelText(element),
          nearbyText: nearbyText(element),
          value: element.value || '',
          checked: Boolean(element.checked),
          options,
          isRequired: Boolean(element.required),
          isVisible: visible(element)
        };
      })
      .filter((field) => field.isVisible);
  });
}
