import { useState } from 'react'
import { Segmented } from '../../components/Segmented'
import { ApplicationsTab } from './ApplicationsTab'
import { FilesTab } from './FilesTab'
import { ProfileTab } from './ProfileTab'
import './applications.css'

type Tab = 'applications' | 'profile' | 'files'

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'applications', label: 'Applications' },
  { value: 'profile', label: 'Profile' },
  { value: 'files', label: 'Files' }
]

/** Scholarships and jobs: the tracker, the "About me" profile they draw from, and the proof documents. */
export function ApplicationsPage(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('applications')
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Applications</h1>
        <Segmented<Tab> label="Section" value={tab} options={TABS} onChange={setTab} />
      </header>
      <div className="apps-page-body" data-tab={tab}>
        {tab === 'applications' && <ApplicationsTab />}
        {tab === 'profile' && <ProfileTab />}
        {tab === 'files' && <FilesTab />}
      </div>
    </>
  )
}
