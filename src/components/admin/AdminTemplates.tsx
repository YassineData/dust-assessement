import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, ChevronRight, Pencil, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';

interface Template {
  id: string;
  name: string;
  description: string | null;
  status: string;
  version: number;
  created_at: string;
}

interface Thematic {
  id: string;
  name: string;
  name_en: string | null;
  description: string | null;
  display_order: number;
  template_id: string;
}

interface Question {
  id: string;
  question_text: string;
  question_text_en: string | null;
  question_type: string;
  display_order: number;
  thematic_id: string;
  is_required: boolean;
}

interface Answer {
  id: string;
  answer_text: string;
  answer_text_en: string | null;
  score: number;
  display_order: number;
  question_id: string;
}

export const AdminTemplates = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [thematics, setThematics] = useState<Thematic[]>([]);
  const [selectedThematic, setSelectedThematic] = useState<Thematic | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);

  // Dialog states
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showThematicDialog, setShowThematicDialog] = useState(false);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [showAnswerDialog, setShowAnswerDialog] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDescriptionEn, setFormDescriptionEn] = useState('');
  const [formStatus, setFormStatus] = useState('draft');
  const [formQuestionText, setFormQuestionText] = useState('');
  const [formQuestionTextEn, setFormQuestionTextEn] = useState('');
  const [formQuestionType, setFormQuestionType] = useState('likert_5');
  const [formAnswerText, setFormAnswerText] = useState('');
  const [formAnswerTextEn, setFormAnswerTextEn] = useState('');
  const [formAnswerScore, setFormAnswerScore] = useState(0);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await supabase.from('assessment_templates').select('*').order('created_at', { ascending: false });
    setTemplates(data || []);
    setLoading(false);
  };

  const fetchThematics = async (templateId: string) => {
    const { data } = await supabase.from('template_thematics').select('*').eq('template_id', templateId).order('display_order');
    setThematics(data || []);
  };

  const fetchQuestions = async (thematicId: string) => {
    const { data } = await supabase.from('template_questions').select('*').eq('thematic_id', thematicId).order('display_order');
    setQuestions(data || []);
  };

  const fetchAnswers = async (questionId: string) => {
    const { data } = await supabase.from('template_answers').select('*').eq('question_id', questionId).order('display_order');
    setAnswers(data || []);
  };

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setSelectedThematic(null);
    setSelectedQuestion(null);
    setQuestions([]);
    setAnswers([]);
    fetchThematics(template.id);
  };

  const handleSelectThematic = (thematic: Thematic) => {
    setSelectedThematic(thematic);
    setSelectedQuestion(null);
    setAnswers([]);
    fetchQuestions(thematic.id);
  };

  const handleSelectQuestion = (question: Question) => {
    setSelectedQuestion(question);
    fetchAnswers(question.id);
  };

  // CRUD - Template
  const handleSaveTemplate = async () => {
    if (editId) {
      await supabase.from('assessment_templates').update({ name: formName, description: formDescription, status: formStatus as any }).eq('id', editId);
    } else {
      await supabase.from('assessment_templates').insert({ name: formName, description: formDescription, status: formStatus as any });
    }
    setShowTemplateDialog(false);
    resetForm();
    fetchTemplates();
    toast({ title: editId ? 'Template mis à jour' : 'Template créé' });
  };

  // CRUD - Thematic
  const handleSaveThematic = async () => {
    if (!selectedTemplate) return;
    const order = thematics.length + 1;
    if (editId) {
      await supabase.from('template_thematics').update({ name: formName, name_en: formNameEn || null, description: formDescription || null, description_en: formDescriptionEn || null }).eq('id', editId);
    } else {
      await supabase.from('template_thematics').insert({ name: formName, name_en: formNameEn || null, description: formDescription || null, description_en: formDescriptionEn || null, template_id: selectedTemplate.id, display_order: order });
    }
    setShowThematicDialog(false);
    resetForm();
    fetchThematics(selectedTemplate.id);
    toast({ title: editId ? 'Thématique mise à jour' : 'Thématique créée' });
  };

  // CRUD - Question
  const handleSaveQuestion = async () => {
    if (!selectedThematic) return;
    const order = questions.length + 1;
    if (editId) {
      await supabase.from('template_questions').update({ question_text: formQuestionText, question_text_en: formQuestionTextEn || null, question_type: formQuestionType as any }).eq('id', editId);
    } else {
      await supabase.from('template_questions').insert({ question_text: formQuestionText, question_text_en: formQuestionTextEn || null, question_type: formQuestionType as any, thematic_id: selectedThematic.id, display_order: order });
    }
    setShowQuestionDialog(false);
    resetForm();
    fetchQuestions(selectedThematic.id);
    toast({ title: editId ? 'Question mise à jour' : 'Question créée' });
  };

  // CRUD - Answer
  const handleSaveAnswer = async () => {
    if (!selectedQuestion) return;
    const order = answers.length + 1;
    if (editId) {
      await supabase.from('template_answers').update({ answer_text: formAnswerText, answer_text_en: formAnswerTextEn || null, score: formAnswerScore }).eq('id', editId);
    } else {
      await supabase.from('template_answers').insert({ answer_text: formAnswerText, answer_text_en: formAnswerTextEn || null, score: formAnswerScore, question_id: selectedQuestion.id, display_order: order });
    }
    setShowAnswerDialog(false);
    resetForm();
    fetchAnswers(selectedQuestion.id);
    toast({ title: editId ? 'Réponse mise à jour' : 'Réponse créée' });
  };

  const handleDeleteTemplate = async (id: string) => {
    await supabase.from('assessment_templates').delete().eq('id', id);
    if (selectedTemplate?.id === id) { setSelectedTemplate(null); setThematics([]); }
    fetchTemplates();
    toast({ title: 'Template supprimé' });
  };

  const handleDeleteThematic = async (id: string) => {
    await supabase.from('template_thematics').delete().eq('id', id);
    if (selectedThematic?.id === id) { setSelectedThematic(null); setQuestions([]); }
    if (selectedTemplate) fetchThematics(selectedTemplate.id);
    toast({ title: 'Thématique supprimée' });
  };

  const handleDeleteQuestion = async (id: string) => {
    await supabase.from('template_questions').delete().eq('id', id);
    if (selectedQuestion?.id === id) { setSelectedQuestion(null); setAnswers([]); }
    if (selectedThematic) fetchQuestions(selectedThematic.id);
    toast({ title: 'Question supprimée' });
  };

  const handleDeleteAnswer = async (id: string) => {
    await supabase.from('template_answers').delete().eq('id', id);
    if (selectedQuestion) fetchAnswers(selectedQuestion.id);
    toast({ title: 'Réponse supprimée' });
  };

  const resetForm = () => {
    setFormName(''); setFormNameEn(''); setFormDescription(''); setFormDescriptionEn('');
    setFormStatus('draft'); setFormQuestionText(''); setFormQuestionTextEn('');
    setFormQuestionType('likert_5'); setFormAnswerText(''); setFormAnswerTextEn('');
    setFormAnswerScore(0); setEditId(null);
  };

  const openEditTemplate = (t: Template) => {
    setFormName(t.name); setFormDescription(t.description || ''); setFormStatus(t.status);
    setEditId(t.id); setShowTemplateDialog(true);
  };

  const openEditThematic = (t: Thematic) => {
    setFormName(t.name); setFormNameEn(t.name_en || ''); setFormDescription(t.description || ''); setFormDescriptionEn('');
    setEditId(t.id); setShowThematicDialog(true);
  };

  const openEditQuestion = (q: Question) => {
    setFormQuestionText(q.question_text); setFormQuestionTextEn(q.question_text_en || ''); setFormQuestionType(q.question_type);
    setEditId(q.id); setShowQuestionDialog(true);
  };

  const openEditAnswer = (a: Answer) => {
    setFormAnswerText(a.answer_text); setFormAnswerTextEn(a.answer_text_en || ''); setFormAnswerScore(a.score);
    setEditId(a.id); setShowAnswerDialog(true);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Templates</h1>
          <p className="text-muted-foreground">Créez et gérez vos templates d'assessment</p>
        </div>
        <Button onClick={() => { resetForm(); setShowTemplateDialog(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Nouveau template
        </Button>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button onClick={() => { setSelectedTemplate(null); setSelectedThematic(null); setSelectedQuestion(null); }} className="text-primary hover:underline">Templates</button>
        {selectedTemplate && (
          <>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <button onClick={() => { setSelectedThematic(null); setSelectedQuestion(null); }} className="text-primary hover:underline">{selectedTemplate.name}</button>
          </>
        )}
        {selectedThematic && (
          <>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <button onClick={() => setSelectedQuestion(null)} className="text-primary hover:underline">{selectedThematic.name}</button>
          </>
        )}
        {selectedQuestion && (
          <>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground truncate max-w-[200px]">{selectedQuestion.question_text}</span>
          </>
        )}
      </div>

      {/* Level 1: Templates list */}
      {!selectedTemplate && (
        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleSelectTemplate(t)}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === 'active' ? 'default' : 'secondary'}>
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell>v{t.version}</TableCell>
                  <TableCell>{new Date(t.created_at).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => openEditTemplate(t)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteTemplate(t.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {templates.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun template. Créez-en un pour commencer.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Level 2: Thematics */}
      {selectedTemplate && !selectedThematic && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="card-title">Thématiques de "{selectedTemplate.name}"</h2>
            <Button onClick={() => { resetForm(); setShowThematicDialog(true); }} size="sm" className="gap-2"><Plus className="w-4 h-4" /> Ajouter</Button>
          </div>
          <div className="card-elevated overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Nom (FR)</TableHead>
                  <TableHead>Nom (EN)</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {thematics.map((t) => (
                  <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleSelectThematic(t)}>
                    <TableCell>{t.display_order}</TableCell>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-muted-foreground">{t.name_en || '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => openEditThematic(t)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteThematic(t.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {thematics.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Aucune thématique.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Level 3: Questions */}
      {selectedThematic && !selectedQuestion && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="card-title">Questions de "{selectedThematic.name}"</h2>
            <Button onClick={() => { resetForm(); setShowQuestionDialog(true); }} size="sm" className="gap-2"><Plus className="w-4 h-4" /> Ajouter</Button>
          </div>
          <div className="card-elevated overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((q) => (
                  <TableRow key={q.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleSelectQuestion(q)}>
                    <TableCell>{q.display_order}</TableCell>
                    <TableCell className="font-medium max-w-md truncate">{q.question_text}</TableCell>
                    <TableCell><Badge variant="outline">{q.question_type}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => openEditQuestion(q)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteQuestion(q.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {questions.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Aucune question.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Level 4: Answers */}
      {selectedQuestion && (
        <div className="space-y-4">
          <div>
            <h2 className="card-title mb-1">Réponses</h2>
            <p className="text-sm text-muted-foreground">{selectedQuestion.question_text}</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => { resetForm(); setShowAnswerDialog(true); }} size="sm" className="gap-2"><Plus className="w-4 h-4" /> Ajouter</Button>
          </div>
          <div className="card-elevated overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Réponse (FR)</TableHead>
                  <TableHead>Réponse (EN)</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {answers.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.display_order}</TableCell>
                    <TableCell className="font-medium">{a.answer_text}</TableCell>
                    <TableCell className="text-muted-foreground">{a.answer_text_en || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={a.score > 0 ? 'default' : 'secondary'}>{a.score}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditAnswer(a)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteAnswer(a.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {answers.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucune réponse.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Modifier le template' : 'Nouveau template'}</DialogTitle>
            <DialogDescription>Remplissez les champs ci-dessous.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Assessment Maturité IA v2" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Description du template..." />
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="archived">Archivé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveTemplate} className="w-full">
              {editId ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Thematic Dialog */}
      <Dialog open={showThematicDialog} onOpenChange={setShowThematicDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Modifier la thématique' : 'Nouvelle thématique'}</DialogTitle>
            <DialogDescription>Remplissez les champs ci-dessous.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom (FR)</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Maîtrise IA" />
            </div>
            <div className="space-y-2">
              <Label>Nom (EN)</Label>
              <Input value={formNameEn} onChange={(e) => setFormNameEn(e.target.value)} placeholder="Ex: AI Mastery" />
            </div>
            <div className="space-y-2">
              <Label>Description (FR)</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
            </div>
            <Button onClick={handleSaveThematic} className="w-full">
              {editId ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Question Dialog */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Modifier la question' : 'Nouvelle question'}</DialogTitle>
            <DialogDescription>Remplissez les champs ci-dessous.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Question (FR)</Label>
              <Textarea value={formQuestionText} onChange={(e) => setFormQuestionText(e.target.value)} placeholder="Ex: Je me sens à l'aise avec l'IA..." />
            </div>
            <div className="space-y-2">
              <Label>Question (EN)</Label>
              <Textarea value={formQuestionTextEn} onChange={(e) => setFormQuestionTextEn(e.target.value)} placeholder="English translation..." />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formQuestionType} onValueChange={setFormQuestionType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="likert_5">Likert 5</SelectItem>
                  <SelectItem value="likert_7">Likert 7</SelectItem>
                  <SelectItem value="multiple_choice">Choix multiples</SelectItem>
                  <SelectItem value="yes_no">Oui / Non</SelectItem>
                  <SelectItem value="scale_10">Échelle 1-10</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveQuestion} className="w-full">
              {editId ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Answer Dialog */}
      <Dialog open={showAnswerDialog} onOpenChange={setShowAnswerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Modifier la réponse' : 'Nouvelle réponse'}</DialogTitle>
            <DialogDescription>Définissez le texte et le score de la réponse.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Réponse (FR)</Label>
              <Input value={formAnswerText} onChange={(e) => setFormAnswerText(e.target.value)} placeholder="Ex: Tout à fait d'accord" />
            </div>
            <div className="space-y-2">
              <Label>Réponse (EN)</Label>
              <Input value={formAnswerTextEn} onChange={(e) => setFormAnswerTextEn(e.target.value)} placeholder="Ex: Strongly agree" />
            </div>
            <div className="space-y-2">
              <Label>Score</Label>
              <Input type="number" value={formAnswerScore} onChange={(e) => setFormAnswerScore(Number(e.target.value))} />
            </div>
            <Button onClick={handleSaveAnswer} className="w-full">
              {editId ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
