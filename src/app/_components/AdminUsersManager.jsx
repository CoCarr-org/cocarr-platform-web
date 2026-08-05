'use client'
import React, { useEffect, useMemo, useState } from 'react'
import authAxios from '@/app/_helpers/axios'
import { InfoToast, ErrorToast } from '@/app/_helpers/toasters'
import Popup from '@/app/_components/Popup'
import Input from '@/app/_components/Input'

// Full admin-user CRUD. Each admin is assigned a TEAM and a LEVEL within it —
// that pair drives what they can access (see Teams & Access). Teams/levels come
// from GET /admin/teams so the labels live in one place.
const select = 'w-full border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#ECC032] bg-white'

export default function AdminUsersManager() {
  const [admins, setAdmins] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false) // false | true | {resetLink, name}
  const [deleting, setDeleting] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const teamsById = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams])
  const describe = (admin) => {
    const team = teamsById[admin.teamId]
    if (!team) return 'No team'
    const level = team.levels.find((l) => l.id === admin.teamLevelId)
    return level ? `${team.name} · ${level.name}` : team.name
  }

  async function getAdmins() {
    try {
      setLoading(true)
      const res = await authAxios.get('/admin')
      setAdmins(res.data || [])
    } catch (error) {
      ErrorToast('Could not load admins')
    } finally {
      setLoading(false)
    }
  }
  async function getTeams() {
    try {
      const res = await authAxios.get('/admin/teams')
      setTeams(res.data?.teams || [])
    } catch (error) {
      // Non-fatal: list still renders; team names just fall back to "No team".
    }
  }

  useEffect(() => { getAdmins(); getTeams() }, [])

  const onSubmitEdit = async (e, data) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await authAxios.put(`/admin/${editing.id}`, {
        name: data.name, email: data.email, mobile: data.mobile, isActive: data.isActive,
        teamId: data.teamId ? Number(data.teamId) : null,
        teamLevelId: data.teamLevelId ? Number(data.teamLevelId) : null,
      })
      InfoToast('Admin updated')
      setEditing(null)
      await getAdmins()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not update admin')
    } finally { setSubmitting(false) }
  }

  const onSubmitCreate = async (e, data) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await authAxios.post('/admin', {
        name: data.name, email: data.email, mobile: data.mobile,
        teamId: data.teamId ? Number(data.teamId) : null,
        teamLevelId: data.teamLevelId ? Number(data.teamLevelId) : null,
      })
      InfoToast('Admin created')
      setCreating({ resetLink: res.data?.resetLink, name: data.name })
      await getAdmins()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not create admin')
    } finally { setSubmitting(false) }
  }

  const onConfirmDelete = async () => {
    setSubmitting(true)
    try {
      await authAxios.delete(`/admin/${deleting.id}`)
      InfoToast('Admin deleted')
      setDeleting(null)
      await getAdmins()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not delete admin')
    } finally { setSubmitting(false) }
  }

  return (
    <div className='w-full flex-1 py-6'>
      <div className='flex justify-end gap-3 mb-4'>
        <button type='button' className='btn-md' onClick={() => setCreating(true)}>+ Add Admin</button>
      </div>

      <div className='overflow-hidden rounded-md border border-gray-100 shadow-xs shadow-gray-200 bg-white'>
        {loading && <p className='px-6 py-4 text-sm text-[#757575]'>Loading…</p>}
        {!loading && admins.length === 0 && <p className='px-6 py-4 text-sm text-[#757575]'>No admins found.</p>}
        {admins.map((admin) => (
          <div key={admin.id} className='border-b border-gray-100 last:border-b-0 flex justify-between items-center px-6 py-4'>
            <div>
              <p className='text-sm font-semibold tracking-tight'>{admin.name}</p>
              <p className='text-xs text-[#757575]'>{admin.email} {admin.mobile ? `· ${admin.mobile}` : ''}</p>
            </div>
            <div className='flex items-center gap-3'>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${admin.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {admin.isActive ? 'Active' : 'Inactive'}
              </span>
              <span className='text-xs text-[#757575]'>{describe(admin)}</span>
              <button type='button' className='py-2 px-4 text-xs font-semibold hover:bg-[#f3f3f3] rounded-md' onClick={() => setEditing(admin)}>Edit</button>
              <button type='button' className='py-2 px-4 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-md' onClick={() => setDeleting(admin)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <AdminForm mode='edit' admin={editing} teams={teams} submitting={submitting}
          onClose={() => setEditing(null)} onSubmit={onSubmitEdit} />
      )}
      {creating === true && (
        <AdminForm mode='create' teams={teams} submitting={submitting}
          onClose={() => setCreating(false)} onSubmit={onSubmitCreate} />
      )}
      {creating && creating !== true && (
        <CreateAdminSuccessPopup info={creating} onClose={() => setCreating(false)} />
      )}
      {deleting && (
        <ConfirmDeletePopup admin={deleting} submitting={submitting} onClose={() => setDeleting(null)} onConfirm={onConfirmDelete} />
      )}
    </div>
  )
}

// One form for create + edit. Team drives which levels are selectable; picking
// a team auto-selects its default level.
const AdminForm = ({ mode, admin = {}, teams, submitting, onClose, onSubmit }) => {
  const [name, setName] = useState(admin.name || '')
  const [email, setEmail] = useState(admin.email || '')
  const [mobile, setMobile] = useState(admin.mobile || '')
  const [isActive, setIsActive] = useState(admin.isActive ?? true)
  const [teamId, setTeamId] = useState(admin.teamId ? String(admin.teamId) : '')
  const [teamLevelId, setTeamLevelId] = useState(admin.teamLevelId ? String(admin.teamLevelId) : '')

  const team = teams.find((t) => String(t.id) === String(teamId))
  const levels = team?.levels || []

  const onTeamChange = (value) => {
    setTeamId(value)
    const t = teams.find((x) => String(x.id) === String(value))
    const def = t?.levels.find((l) => l.isDefault) || t?.levels[0]
    setTeamLevelId(def ? String(def.id) : '')
  }

  const isEdit = mode === 'edit'
  const formId = isEdit ? 'editAdminForm' : 'createAdminForm'
  const payload = { name, email, mobile, teamId, teamLevelId, ...(isEdit ? { isActive } : {}) }

  return (
    <Popup onClose={onClose} title={isEdit ? `Edit admin — ${admin.name}` : 'Add admin'}
      submitTitle={isEdit ? 'Save' : 'Create'} formName={formId} submitting={submitting}>
      <form className='w-full' id={formId} onSubmit={(e) => onSubmit(e, payload)}>
        <div className='mb-4'>
          <label className='text-xs text-[#757575] block mb-1'>Name</label>
          <Input value={name} setValue={setName} placeholder='Name' required />
        </div>
        <div className='mb-4'>
          <label className='text-xs text-[#757575] block mb-1'>Email</label>
          <Input type='email' value={email} setValue={setEmail} placeholder='Email' required />
        </div>
        <div className='mb-4'>
          <label className='text-xs text-[#757575] block mb-1'>Mobile</label>
          <Input value={mobile} setValue={setMobile} placeholder='10-digit mobile' number required />
        </div>

        <div className='grid grid-cols-2 gap-3 mb-4'>
          <div>
            <label className='text-xs text-[#757575] block mb-1'>Team</label>
            <select className={select} value={teamId} onChange={(e) => onTeamChange(e.target.value)} required>
              <option value=''>Select team</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className='text-xs text-[#757575] block mb-1'>Level</label>
            <select className={select} value={teamLevelId} onChange={(e) => setTeamLevelId(e.target.value)} disabled={!team} required>
              <option value=''>{team ? 'Select level' : 'Pick a team first'}</option>
              {levels.map((l) => <option key={l.id} value={l.id}>{l.name}{l.isDefault ? ' (default)' : ''}</option>)}
            </select>
          </div>
        </div>

        {isEdit && (
          <div>
            <label className='text-xs text-[#757575] block mb-1'>Status</label>
            <div className='flex gap-2'>
              <button type='button' onClick={() => setIsActive(true)} className={`px-4 py-2 rounded-md text-xs font-semibold ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-[#757575]'}`}>Active</button>
              <button type='button' onClick={() => setIsActive(false)} className={`px-4 py-2 rounded-md text-xs font-semibold ${!isActive ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-[#757575]'}`}>Inactive</button>
            </div>
          </div>
        )}
      </form>
    </Popup>
  )
}

// The new admin's password is unknown to anyone (Firebase account created with
// a random one), so this reset link is how they first sign in.
const CreateAdminSuccessPopup = ({ info, onClose }) => {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(info.resetLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }
  return (
    <Popup onClose={onClose} title={`${info.name} created`} submitTitle={'Done'} formName={'createAdminDoneForm'}>
      <form id='createAdminDoneForm' onSubmit={(e) => { e.preventDefault(); onClose() }}>
        {info.resetLink ? (
          <>
            <p className='text-sm mb-2'>Share this link with them so they can set their password and sign in:</p>
            <div className='flex items-center gap-2'>
              <input readOnly value={info.resetLink} className='text-input flex-1 text-xs' onFocus={(e) => e.target.select()} />
              <button type='button' className='btn-md-disabled' onClick={copy}>{copied ? 'Copied!' : 'Copy'}</button>
            </div>
          </>
        ) : (
          <p className='text-sm'>Admin created, but a password-reset link could not be generated. Use the Firebase console to send one manually.</p>
        )}
      </form>
    </Popup>
  )
}

const ConfirmDeletePopup = ({ admin, submitting, onClose, onConfirm }) => (
  <Popup onClose={onClose} title={'Delete admin'} submitTitle={'Delete'} onSubmittingTitle={'Deleting'} formName={'deleteAdminForm'} submitting={submitting}>
    <form id='deleteAdminForm' onSubmit={(e) => { e.preventDefault(); onConfirm() }}>
      <p className='text-sm'>Delete <strong>{admin.name}</strong>? This removes their sign-in access. This cannot be undone from here.</p>
    </form>
  </Popup>
)
