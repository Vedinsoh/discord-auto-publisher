import { type FilterType, FilterType as FilterTypes } from '@ap/validations';
import {
  LabelBuilder,
  type ModalSubmitInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { emojis } from 'lib/constants/index.js';

/**
 * Per-field operator wording. `negate: false` uses `positive`, `true` uses `negative`.
 * Replaces the old allow/block mode — a negated condition is "block this".
 */
export const OPERATOR_LABELS: Record<FilterType, { positive: string; negative: string }> = {
  [FilterTypes.Keyword]: { positive: 'Contains', negative: "Doesn't contain" },
  [FilterTypes.Author]: { positive: 'Is from', negative: 'Is not from' },
  [FilterTypes.Mention]: { positive: 'Mentions', negative: "Doesn't mention" },
  [FilterTypes.Webhook]: { positive: 'Is from', negative: 'Is not from' },
};

/** Human-readable operator for a condition. */
export const operatorLabel = (type: FilterType, negate: boolean): string =>
  negate ? OPERATOR_LABELS[type].negative : OPERATOR_LABELS[type].positive;

const INCLUDE = 'include';
const EXCLUDE = 'exclude';

/**
 * Modal Label + StringSelect for a condition's operator, mapped to `negate`.
 * @param type Filter field the operator describes
 * @param currentNegate Existing value to preselect (edit flow); omit for create
 */
export const buildOperatorLabel = (type: FilterType, currentNegate?: boolean): LabelBuilder => {
  const labels = OPERATOR_LABELS[type];
  const select = new StringSelectMenuBuilder()
    .setCustomId('operator')
    .setPlaceholder('Select how this condition matches')
    .setRequired(true)
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(labels.positive)
        .setValue(INCLUDE)
        .setDescription('Publish messages that match')
        .setEmoji(emojis.checkmark)
        .setDefault(currentNegate === false),
      new StringSelectMenuOptionBuilder()
        .setLabel(labels.negative)
        .setValue(EXCLUDE)
        .setDescription("Don't publish messages that match")
        .setEmoji(emojis.crossmark)
        .setDefault(currentNegate === true)
    );
  return new LabelBuilder().setLabel('Condition').setStringSelectMenuComponent(select);
};

/** Read the operator select back as a `negate` boolean; null if missing/invalid. */
export const extractNegate = (modalSubmit: ModalSubmitInteraction): boolean | null => {
  const label = modalSubmit.components.find(
    entry => 'component' in entry && entry.component.customId === 'operator'
  );
  if (!label || !('component' in label)) return null;
  const component = label.component;
  const value =
    'values' in component && Array.isArray(component.values) ? component.values[0] : undefined;
  if (value === INCLUDE) return false;
  if (value === EXCLUDE) return true;
  return null;
};
