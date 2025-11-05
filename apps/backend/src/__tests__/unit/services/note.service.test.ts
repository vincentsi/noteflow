import { prismaMock } from '../../helpers/test-db'
import { NoteService } from '../../../services/note.service'
import { Note, PlanType } from '@prisma/client'

describe('NoteService', () => {
  let noteService: NoteService

  beforeEach(() => {
    noteService = new NoteService()
    jest.clearAllMocks()
  })

  describe('createNote', () => {
    it('should create note for user', async () => {
      const noteData = {
        title: 'Test Note',
        content: '# Test Content\n\nThis is a markdown note.',
        tags: ['test', 'markdown'],
      }

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@test.com',
        password: 'hashed',
        name: 'Test',
        role: 'USER',
        emailVerified: true,
        planType: PlanType.FREE,
        language: 'fr',
        stripeCustomerId: null,
        subscriptionStatus: 'NONE',
        subscriptionId: null,
        currentPeriodEnd: null,
        lastLoginAt: null,
        lastLoginIp: null,
        loginCount: 0,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      prismaMock.note.count.mockResolvedValue(5) // Under FREE limit (20)

      prismaMock.note.create.mockResolvedValue({
        id: 'note-1',
        userId: 'user-123',
        ...noteData,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Note)

      const result = await noteService.createNote('user-123', noteData)

      expect(result.title).toBe('Test Note')
      expect(result.content).toBe('# Test Content\n\nThis is a markdown note.')
      expect(result.tags).toEqual(['test', 'markdown'])
    })

    it('should throw error if limit reached (FREE plan)', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@test.com',
        password: 'hashed',
        name: 'Test',
        role: 'USER',
        emailVerified: true,
        planType: PlanType.FREE,
        language: 'fr',
        stripeCustomerId: null,
        subscriptionStatus: 'NONE',
        subscriptionId: null,
        currentPeriodEnd: null,
        lastLoginAt: null,
        lastLoginIp: null,
        loginCount: 0,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      prismaMock.note.count.mockResolvedValue(20) // At FREE limit

      await expect(
        noteService.createNote('user-123', { title: 'Test', content: '', tags: [] })
      ).rejects.toThrow('Note limit reached')
    })

    it('should allow creation for STARTER plan under limit', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@test.com',
        password: 'hashed',
        name: 'Test',
        role: 'USER',
        emailVerified: true,
        planType: PlanType.STARTER,
        language: 'fr',
        stripeCustomerId: 'cus_123',
        subscriptionStatus: 'ACTIVE',
        subscriptionId: 'sub_123',
        currentPeriodEnd: new Date(),
        lastLoginAt: null,
        lastLoginIp: null,
        loginCount: 0,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      prismaMock.note.count.mockResolvedValue(50)

      prismaMock.note.create.mockResolvedValue({
        id: 'note-1',
        userId: 'user-123',
        title: 'Test',
        content: 'Content',
        tags: [],
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Note)

      const result = await noteService.createNote('user-123', {
        title: 'Test',
        content: 'Content',
        tags: [],
      })

      expect(result).toBeDefined()
    })
  })

  describe('getUserNotes', () => {
    it('should return user notes', async () => {
      const mockNotes = [
        {
          id: 'note-1',
          userId: 'user-123',
          title: 'Note 1',
          content: 'Content 1',
          tags: ['tag1'],
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'note-2',
          userId: 'user-123',
          title: 'Note 2',
          content: 'Content 2',
          tags: ['tag2'],
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as Note[]

      prismaMock.note.findMany.mockResolvedValue(mockNotes)

      const result = await noteService.getUserNotes('user-123')

      expect(result).toHaveLength(2)
      expect(result[0].title).toBe('Note 1')
    })

    it('should filter by tags', async () => {
      prismaMock.note.findMany.mockResolvedValue([])

      await noteService.getUserNotes('user-123', { tags: ['work'] })

      expect(prismaMock.note.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          deletedAt: null, // Soft delete filter
          tags: { hasSome: ['work'] },
        },
        orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
      })
    })
  })

  describe('updateNote', () => {
    it('should update note', async () => {
      const existingNote = {
        id: 'note-1',
        userId: 'user-123',
        title: 'Original Title',
        content: 'Original content',
        tags: [],
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Note

      const updatedNote = {
        id: 'note-1',
        userId: 'user-123',
        title: 'Updated Title',
        content: 'Updated content',
        tags: ['updated'],
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Note

      prismaMock.note.findFirst.mockResolvedValue(existingNote)
      prismaMock.note.update.mockResolvedValue(updatedNote)

      const result = await noteService.updateNote('note-1', 'user-123', {
        title: 'Updated Title',
      })

      expect(result.title).toBe('Updated Title')
      expect(prismaMock.note.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'note-1',
          userId: 'user-123',
          deletedAt: null, // Soft delete filter
        },
      })
      expect(prismaMock.note.update).toHaveBeenCalledWith({
        where: {
          id: 'note-1',
        },
        data: {
          title: 'Updated Title',
        },
      })
    })

    it('should throw error if note not found', async () => {
      prismaMock.note.findFirst.mockResolvedValue(null)

      await expect(noteService.updateNote('note-1', 'user-123', { title: 'Test' })).rejects.toThrow(
        'Note not found'
      )
    })
  })

  describe('deleteNote', () => {
    it('should delete note', async () => {
      // Mock findFirst to check if note exists
      prismaMock.note.findFirst.mockResolvedValue({
        id: 'note-1',
        userId: 'user-123',
        title: 'Deleted',
        content: 'Content',
        tags: [],
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Note)

      // Mock update for soft delete
      prismaMock.note.update.mockResolvedValue({
        id: 'note-1',
        userId: 'user-123',
        title: 'Deleted',
        content: 'Content',
        tags: [],
        deletedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Note)

      await noteService.deleteNote('note-1', 'user-123')

      expect(prismaMock.note.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'note-1',
          userId: 'user-123',
          deletedAt: null,
        },
      })
      expect(prismaMock.note.update).toHaveBeenCalledWith({
        where: {
          id: 'note-1',
        },
        data: {
          deletedAt: expect.any(Date),
        },
      })
    })
  })

  describe('searchNotes', () => {
    it('should search notes by content', async () => {
      prismaMock.note.findMany.mockResolvedValue([
        {
          id: 'note-1',
          userId: 'user-123',
          title: 'Contains search term',
          content: 'Some content with search term',
          tags: [],
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as Note[])

      const result = await noteService.searchNotes('user-123', 'search term')

      expect(result).toHaveLength(1)
      expect(prismaMock.note.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          deletedAt: null, // Soft delete filter
          OR: [
            { title: { contains: 'search term', mode: 'insensitive' } },
            { content: { contains: 'search term', mode: 'insensitive' } },
          ],
        },
        orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
      })
    })
  })
})
