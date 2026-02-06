import type { LabourCompany, LabourQuestion } from '@/types'
import { getSupabaseClient } from './supabase-client'

// Database row types
interface CompanyRow {
    id: string
    name: string
    logo_url: string | null
    created_at: string
}

interface QuestionRow {
    id: string
    company_id: string
    question: string
    answer: string | null
    tags: string[] | null
    submitted_by: string | null
    created_at: string
    updated_at: string
}

function toCompany(row: CompanyRow, questionCount?: number): LabourCompany {
    return {
        id: row.id,
        name: row.name,
        logoUrl: row.logo_url ?? undefined,
        createdAt: new Date(row.created_at),
        questionCount,
    }
}

function toQuestion(row: QuestionRow): LabourQuestion {
    return {
        id: row.id,
        companyId: row.company_id,
        question: row.question,
        answer: row.answer ?? undefined,
        tags: row.tags ?? [],
        submittedBy: row.submitted_by ?? undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    }
}

// Get all companies with question counts
export async function getLabourCompanies(): Promise<LabourCompany[]> {
    const supabase = getSupabaseClient()

    // Get companies
    const { data: companies, error: companiesError } = await supabase
        .from('labour_companies')
        .select('*')
        .order('name')

    if (companiesError) {
        console.error('Error fetching labour companies:', companiesError)
        return []
    }

    // Get question counts per company
    const { data: counts, error: countsError } = await supabase
        .from('labour_questions')
        .select('company_id')

    if (countsError) {
        console.error('Error fetching question counts:', countsError)
    }

    const countMap = new Map<string, number>()
    if (counts) {
        for (const row of counts) {
            const current = countMap.get(row.company_id) ?? 0
            countMap.set(row.company_id, current + 1)
        }
    }

    return (companies as CompanyRow[]).map(c => toCompany(c, countMap.get(c.id) ?? 0))
}

// Get company by ID
export async function getLabourCompanyById(id: string): Promise<LabourCompany | null> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
        .from('labour_companies')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !data) {
        console.error('Error fetching labour company:', error)
        return null
    }

    return toCompany(data as CompanyRow)
}

// Get questions by company
export async function getLabourQuestions(companyId?: string): Promise<LabourQuestion[]> {
    const supabase = getSupabaseClient()

    let query = supabase
        .from('labour_questions')
        .select('*')
        .order('created_at', { ascending: false })

    if (companyId) {
        query = query.eq('company_id', companyId)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching labour questions:', error)
        return []
    }

    return (data as QuestionRow[]).map(toQuestion)
}

// Get single question by ID
export async function getLabourQuestionById(id: string): Promise<LabourQuestion | null> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
        .from('labour_questions')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !data) {
        console.error('Error fetching labour question:', error)
        return null
    }

    return toQuestion(data as QuestionRow)
}

// Submit new question (admin only)
export async function submitLabourQuestion(input: {
    companyId: string
    question: string
    answer?: string
    tags?: string[]
}): Promise<LabourQuestion | null> {
    const supabase = getSupabaseClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        console.error('User not authenticated')
        return null
    }

    const { data, error } = await supabase
        .from('labour_questions')
        .insert({
            company_id: input.companyId,
            question: input.question,
            answer: input.answer ?? null,
            tags: input.tags ?? [],
            submitted_by: user.id,
        })
        .select()
        .single()

    if (error) {
        console.error('Error submitting labour question:', error)
        return null
    }

    return toQuestion(data as QuestionRow)
}

// Update question (admin only)
export async function updateLabourQuestion(
    id: string,
    input: {
        question?: string
        answer?: string
        tags?: string[]
    }
): Promise<boolean> {
    const supabase = getSupabaseClient()

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (input.question !== undefined) updateData.question = input.question
    if (input.answer !== undefined) updateData.answer = input.answer
    if (input.tags !== undefined) updateData.tags = input.tags

    const { error } = await supabase
        .from('labour_questions')
        .update(updateData)
        .eq('id', id)

    if (error) {
        console.error('Error updating labour question:', error)
        return false
    }

    return true
}

// Delete question (admin only)
export async function deleteLabourQuestion(id: string): Promise<boolean> {
    const supabase = getSupabaseClient()

    const { error } = await supabase
        .from('labour_questions')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting labour question:', error)
        return false
    }

    return true
}

// Check if current user is admin
export async function isCurrentUserAdmin(): Promise<boolean> {
    const supabase = getSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (error || !data) return false

    return data.role === 'admin'
}

// ========== Company Management (Admin) ==========

// Create new company
export async function createLabourCompany(input: {
    id: string
    name: string
    logoUrl?: string
}): Promise<LabourCompany | null> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
        .from('labour_companies')
        .insert({
            id: input.id,
            name: input.name,
            logo_url: input.logoUrl ?? null,
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating labour company:', error)
        return null
    }

    return toCompany(data as CompanyRow)
}

// Update company
export async function updateLabourCompany(
    id: string,
    input: {
        name?: string
        logoUrl?: string
    }
): Promise<boolean> {
    const supabase = getSupabaseClient()

    const updateData: Record<string, unknown> = {}
    if (input.name !== undefined) updateData.name = input.name
    if (input.logoUrl !== undefined) updateData.logo_url = input.logoUrl

    const { error } = await supabase
        .from('labour_companies')
        .update(updateData)
        .eq('id', id)

    if (error) {
        console.error('Error updating labour company:', error)
        return false
    }

    return true
}

// Delete company
export async function deleteLabourCompany(id: string): Promise<boolean> {
    const supabase = getSupabaseClient()

    const { error } = await supabase
        .from('labour_companies')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting labour company:', error)
        return false
    }

    return true
}

