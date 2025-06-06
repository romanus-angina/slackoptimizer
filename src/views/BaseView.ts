import { BlockKitView, BlockKitElement, ViewState } from '@/types/ui';

// Base view class for Block Kit rendering
export class BaseView {
  protected state: ViewState = { loading: false };

  // Abstract method that each view must implement
  render(): any {
    throw new Error('render() must be implemented by subclass');
  }

  // Common Block Kit elements
  protected createHeaderBlock(text: string): BlockKitElement {
    return {
      type: 'header',
      text: {
        type: 'plain_text',
        text: text
      }
    };
  }

  protected createSectionBlock(text: string, accessory?: BlockKitElement): BlockKitElement {
    const block: BlockKitElement = {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: text
      }
    };

    if (accessory) {
      block.accessory = accessory;
    }

    return block;
  }

  protected createButtonElement(
    text: string, 
    actionId: string, 
    value?: string, 
    style?: 'primary' | 'danger'
  ): BlockKitElement {
    const button: BlockKitElement = {
      type: 'button',
      text: {
        type: 'plain_text',
        text: text
      },
      action_id: actionId
    };

    if (value) button.value = value;
    if (style) button.style = style;

    return button;
  }

  protected createSelectElement(
    placeholder: string,
    actionId: string,
    options: Array<{ text: string; value: string }>
  ): BlockKitElement {
    return {
      type: 'static_select',
      placeholder: {
        type: 'plain_text',
        text: placeholder
      },
      action_id: actionId,
      options: options.map(option => ({
        text: {
          type: 'plain_text',
          text: option.text
        },
        value: option.value
      }))
    };
  }

  protected createActionsBlock(elements: BlockKitElement[]): BlockKitElement {
    return {
      type: 'actions',
      elements: elements
    };
  }

  protected createDividerBlock(): BlockKitElement {
    return {
      type: 'divider'
    };
  }

  protected createLoadingBlock(): BlockKitElement {
    return this.createSectionBlock('Loading... Please wait.');
  }

  protected createErrorBlock(error: string): BlockKitElement {
    return this.createSectionBlock(`Error: ${error}`);
  }

  // Helper to format text with proper escaping
  protected formatText(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Helper to create context block with timestamp
  protected createContextBlock(elements: string[]): BlockKitElement {
    return {
      type: 'context',
      elements: elements.map(element => ({
        type: 'mrkdwn',
        text: element
      }))
    };
  }

  // Set loading state
  protected setLoading(loading: boolean): void {
    this.state.loading = loading;
  }

  // Set error state
  protected setError(error: string): void {
    this.state.error = error;
  }
}