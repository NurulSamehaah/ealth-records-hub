CREATE TYPE public.app_role AS ENUM ('admin','staff','patient');
CREATE TYPE public.doc_category AS ENUM ('lab_report','imaging','prescription','discharge_summary','consent','other');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text,
  phone text,
  mrn text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_clinician(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('staff','admin'));
$$;

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  category public.doc_category NOT NULL DEFAULT 'other',
  notes text,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX documents_patient_idx ON public.documents(patient_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "clinicians read profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_clinician(auth.uid()));
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "clinicians update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.is_clinician(auth.uid())) WITH CHECK (public.is_clinician(auth.uid()));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_clinician(auth.uid()));

CREATE POLICY "patients read own documents" ON public.documents FOR SELECT TO authenticated USING (patient_id = auth.uid());
CREATE POLICY "clinicians read documents" ON public.documents FOR SELECT TO authenticated USING (public.is_clinician(auth.uid()));
CREATE POLICY "clinicians insert documents" ON public.documents FOR INSERT TO authenticated WITH CHECK (public.is_clinician(auth.uid()));
CREATE POLICY "clinicians update documents" ON public.documents FOR UPDATE TO authenticated USING (public.is_clinician(auth.uid())) WITH CHECK (public.is_clinician(auth.uid()));
CREATE POLICY "clinicians delete documents" ON public.documents FOR DELETE TO authenticated USING (public.is_clinician(auth.uid()));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE assigned public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, mrn)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'mrn'
  );
  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    assigned := 'staff';
  ELSE
    assigned := 'patient';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();