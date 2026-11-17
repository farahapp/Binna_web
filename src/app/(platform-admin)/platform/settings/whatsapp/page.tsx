/**
 * Compatibility route.
 *
 * The former "واتساب المنصة" page now renders the single unified WhatsApp
 * Management Centre. Keep this path working for existing bookmarks/tests;
 * it is intentionally absent from the Platform Admin sidebar.
 */
export { default } from '../../../integrations/whatsapp/page'
