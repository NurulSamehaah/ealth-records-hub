DROP POLICY "clinicians read profiles" ON public.profiles;
DROP POLICY "clinicians update profiles" ON public.profiles;
DROP POLICY "own roles read" ON public.user_roles;
DROP POLICY "clinicians read documents" ON public.documents;
DROP POLICY "clinicians insert documents" ON public.documents;
DROP POLICY "clinicians update documents" ON public.documents;
DROP POLICY "clinicians delete documents" ON public.documents;

CREATE POLICY "clinicians read profiles" ON public.profiles FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role IN ('staff','admin')));
CREATE POLICY "clinicians update profiles" ON public.profiles FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role IN ('staff','admin')))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role IN ('staff','admin')));

CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "clinicians read documents" ON public.documents FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role IN ('staff','admin')));
CREATE POLICY "clinicians insert documents" ON public.documents FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role IN ('staff','admin')));
CREATE POLICY "clinicians update documents" ON public.documents FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role IN ('staff','admin')))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role IN ('staff','admin')));
CREATE POLICY "clinicians delete documents" ON public.documents FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role IN ('staff','admin')));

CREATE POLICY "clinicians manage patient files" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'patient-documents' AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role IN ('staff','admin')))
WITH CHECK (bucket_id = 'patient-documents' AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role IN ('staff','admin')));

CREATE POLICY "patients read own files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'patient-documents' AND (storage.foldername(name))[1] = auth.uid()::text);