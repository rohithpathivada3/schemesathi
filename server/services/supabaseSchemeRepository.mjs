import { supabaseRest } from '../lib/supabaseRest.mjs'

function firstRow(rows) {
  return Array.isArray(rows) ? rows[0] ?? null : null
}

export function createSupabaseSchemeRepository() {
  return {
    async getContext(sourceId) {
      const sources = await supabaseRest('ss_information_sources', {
        select: 'id,organization_id,authorized_domain,domain_ids,trust_status,is_enabled',
        id: `eq.${sourceId}`,
        limit: '1',
      })
      const source = firstRow(sources)
      if (!source) {
        throw new Error('Registered source was not found')
      }

      const organizations = source.organization_id
        ? await supabaseRest('ss_organizations', {
          select: 'id,sector,official_domain,verified_at',
          id: `eq.${source.organization_id}`,
          limit: '1',
        })
        : []
      const categories = await supabaseRest('ss_scheme_categories', {
        select: 'id',
        is_active: 'eq.true',
        limit: '100',
      })

      return {
        source,
        organization: firstRow(organizations),
        categoryIds: Array.isArray(categories) ? categories.map((category) => category.id) : [],
      }
    },

    async findByDedupeKey(dedupeKey) {
      const rows = await supabaseRest('ss_schemes', {
        select: '*',
        dedupe_key: `eq.${dedupeKey}`,
        limit: '1',
      })
      return firstRow(rows)
    },

    async findBySourceIdentifier(sourceId, sourceIdentifier) {
      const rows = await supabaseRest('ss_schemes', {
        select: '*',
        source_id: `eq.${sourceId}`,
        source_identifier: `eq.${sourceIdentifier}`,
        limit: '1',
      })
      return firstRow(rows)
    },

    async insertScheme(scheme) {
      const rows = await supabaseRest('ss_schemes', {}, {
        method: 'POST',
        body: scheme,
        prefer: 'return=representation',
      })
      const inserted = firstRow(rows)
      if (!inserted?.id) {
        throw new Error('Supabase did not return the inserted scheme')
      }
      return inserted
    },

    async insertCategories(schemeId, categoryIds) {
      const links = categoryIds.map((categoryId) => ({
        scheme_id: schemeId,
        category_id: categoryId,
      }))
      await supabaseRest('ss_scheme_category_links', { on_conflict: 'scheme_id,category_id' }, {
        method: 'POST',
        body: links,
        prefer: 'resolution=ignore-duplicates,return=minimal',
      })
    },

    async publish(schemeId, publishedAt) {
      await supabaseRest('ss_schemes', { id: `eq.${schemeId}` }, {
        method: 'PATCH',
        body: { is_published: true, published_at: publishedAt },
        prefer: 'return=minimal',
      })
    },

    async recordNewSchemeNotification(schemeId, categoryIds, payload) {
      const existing = await supabaseRest('ss_notifications', {
        select: 'id',
        scheme_id: `eq.${schemeId}`,
        event_type: 'eq.new_scheme',
        limit: '1',
      })
      if (Array.isArray(existing) && existing.length > 0) return

      const links = [...new Set(categoryIds)].map((categoryId) => ({
        scheme_id: schemeId,
        category_id: categoryId,
        event_type: 'new_scheme',
        payload,
      }))
      if (links.length === 0) return
      await supabaseRest('ss_notifications', {}, {
        method: 'POST',
        body: links,
        prefer: 'return=minimal',
      })
    },

    async recordUpdate(update) {
      await supabaseRest('ss_scheme_updates', {}, {
        method: 'POST',
        body: {
          scheme_id: update.schemeId,
          source_id: update.sourceId,
          source_url: update.sourceUrl,
          source_published_at: update.sourcePublishedAt,
          changed_fields: update.changedFields,
          previous_data: update.previousData,
          observed_data: update.observedData,
        },
        prefer: 'return=minimal',
      })
    },

    async createReview(schemeId, reasons) {
      const reviews = await supabaseRest('ss_administrator_reviews', {
        select: 'id',
        scheme_id: `eq.${schemeId}`,
        status: 'eq.pending',
        limit: '1',
      })
      const review = firstRow(reviews)
      const notes = reasons.join('; ')
      if (review) {
        await supabaseRest('ss_administrator_reviews', { id: `eq.${review.id}` }, {
          method: 'PATCH',
          body: { notes, updated_at: new Date().toISOString() },
          prefer: 'return=minimal',
        })
        return
      }
      await supabaseRest('ss_administrator_reviews', {}, {
        method: 'POST',
        body: { scheme_id: schemeId, status: 'pending', notes },
        prefer: 'return=minimal',
      })
    },
  }
}
